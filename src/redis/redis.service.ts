import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient } from 'redis';
import { SocketBridgeEventLog } from '../../types';
import BigNumber from 'bignumber.js';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly client;
  readonly tokenVolumeKey = 'bridge_events:total_volume';
  readonly chainTxCountKey = 'bridge_events:transactions_per_chain';
  readonly bridgeUsageKey = 'bridge_events:bridge_usage';
  private logger: Logger = new Logger('RedisService');

  private readonly tokenDecimalsMapping: Record<string, number> = {
    '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE': 18, // Ether
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 6, // USDC
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 18, // WETH
    '0xdAC17F958D2ee523a2206206994597C13D831ec7': 6, // USDT
    '0x467Bccd9d29f223BcE8043b84E8C8B282827790F': 18, // Multichain Token
    '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0': 18, // MATIC
    '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984': 18, // UNI
    '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F': 18, // SNX
    '0x55296f69f40Ea6d20E478533C15A6B08B654E758': 18, // ZRX
    '0xaaeE1A9723aaDB7afA2810263653A34bA2C21C7a': 18, // Mog Coin
  };

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    this.client.on('error', err => {
      this.logger.error('Redis Client Error:', err);
    });
  }

  async onModuleInit() {
    await this.client.connect();

    try {
      // Initialize token volume key
      const tokenVolumeExists = await this.client.exists(this.tokenVolumeKey);
      if (!tokenVolumeExists) {
        /**
         * @dev: Set a default value for a token to 0 to avoid null values
         */
        await this.client.hSet(
          this.tokenVolumeKey,
          '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          '0',
        );
        this.logger.log(`Initialized ${this.tokenVolumeKey} with default value 0.`);
      }

      // Initialize chain tx count key
      const chainVolumeExists = await this.client.exists(this.chainTxCountKey);
      if (!chainVolumeExists) {
        /**
         * @dev: Set a default value for a chain Id to 0 to avoid null values
         */
        await this.client.hSet(this.chainTxCountKey, '8453', '0');
        this.logger.log(`Initialized ${this.chainTxCountKey} with default value 0.`);
      }
    } catch (error: any) {
      this.logger.error('Error initializing Redis keys', error.stack || error);
      throw new Error('Redis initialization failed');
    }

    this.logger.log('Redis connected');
  }

  async onModuleDestroy() {
    await this.client.disconnect();
    this.logger.log('Redis disconnected');
  }

  getClient() {
    return this.client;
  }

  async publish(channel: string, message: string): Promise<void> {
    try {
      await this.client.publish(channel, message);
    } catch (error: any) {
      this.logger.error(`Failed to publish to channel ${channel}`, error.stack || error);
      throw new Error(`RedisService.publish failed: ${error.message}`);
    }
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    try {
      const subscriber = this.client.duplicate();
      await subscriber.connect();
      await subscriber.subscribe(channel, message => {
        callback(message);
      });
    } catch (error: any) {
      this.logger.error(`Failed to subscribe to channel ${channel}`, error.stack || error);
      throw new Error(`RedisService.subscribe failed: ${error.message}`);
    }
  }

  incrementBigNumber(currentValue: string | null, increment: string): string {
    const current = currentValue ? new BigNumber(currentValue) : new BigNumber(0);
    const updated = current.plus(increment);
    return updated.toString();
  }

  decrementBigNumber(currentValue: string | null, decrement: string): string {
    const current = currentValue ? new BigNumber(currentValue) : new BigNumber(0);
    const updated = current.minus(decrement);
    return updated.toString();
  }

  normalizeAmount(amount: string, decimals: number): BigNumber {
    return new BigNumber(amount).dividedBy(new BigNumber(10).pow(decimals));
  }

  async batchBridgeEventsRedisUpdate(eventData: SocketBridgeEventLog): Promise<{
    updatedTokenVolume: string;
    updatedChainTxCount: string;
    updatedBridgeUseCount: string;
  }> {
    const pipeline = this.client.multi();

    const tokenField = eventData.args.token;
    const chainField = eventData.args.toChainId.toString();
    const amount = eventData.args.amount.toString();
    const decimals = this.tokenDecimalsMapping[tokenField] || 18;

    const normalizedAmount = this.normalizeAmount(amount, decimals).toString();

    try {
      // Fetch current token volume & Tx Count
      pipeline.hGet(this.tokenVolumeKey, tokenField);
      // pipeline.hGet(this.chainTxCountKey, chainField);
      // Increment bridge usage & transaction count
      pipeline.hIncrBy(this.bridgeUsageKey, eventData.args.bridgeName, 1);
      pipeline.hIncrBy(this.chainTxCountKey, eventData.args.toChainId.toString(), 1);

      const [currentTokenVolume, chainTxCount, bridgeUsageCount] = await pipeline.exec();
      console.log('currentTokenVolume', currentTokenVolume);
      console.log('chainTxCount', chainTxCount);
      console.log('bridgeUsageCount', bridgeUsageCount);
      const updatedTokenVolume = this.incrementBigNumber(
        currentTokenVolume as string,
        normalizedAmount,
      );

      const updatedChainTxCount = chainTxCount as string;
      const updatedBridgeUseCount = bridgeUsageCount as string;

      // Update volumes and publish events
      const updatePipeline = this.client.multi();
      updatePipeline.hSet(this.tokenVolumeKey, tokenField, updatedTokenVolume);
      updatePipeline.publish(
        'bridge_events:processed_updates',
        JSON.stringify({
          type: 'token_update',
          token: tokenField,
          totalVolume: updatedTokenVolume,
        }),
      );
      updatePipeline.publish(
        'bridge_events:processed_updates',
        JSON.stringify({
          type: 'chain_update',
          chainId: chainField,
          totalVolume: chainTxCount,
        }),
      );
      updatePipeline.publish(
        'bridge_events:processed_updates',
        JSON.stringify({
          type: 'bridge_usage_update',
          bridge: eventData.args.bridgeName,
          usageCount: bridgeUsageCount,
        }),
      );

      await updatePipeline.exec();

      this.logger.log('Batch Redis updates executed successfully');

      return {
        updatedTokenVolume,
        updatedChainTxCount,
        updatedBridgeUseCount,
      };
    } catch (error: any) {
      this.logger.error('Failed to execute batch Redis updates', error.stack || error);
      throw new Error(`RedisService.batchBridgeEventsRedisUpdate failed: ${error.message}`);
    }
  }
}
