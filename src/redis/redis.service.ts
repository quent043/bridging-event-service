import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient } from 'redis';
import { SocketBridgeEventLog } from '../../types';
import { tokenDecimalsMapping } from '../constants/token-decimals';
import BigNumber from 'bignumber.js';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly client;
  readonly tokenVolumeKey = 'bridge_events:total_volume';
  readonly chainTxCountKey = 'bridge_events:transactions_per_chain';
  readonly bridgeUsageKey = 'bridge_events:bridge_usage';
  private logger: Logger = new Logger('RedisService');

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
    const decimals = tokenDecimalsMapping[tokenField] || 18;

    const normalizedAmount = this.normalizeAmount(amount, decimals).toString();

    try {
      // Fetch current token volume & Tx Count
      pipeline.hGet(this.tokenVolumeKey, tokenField);
      // Increment bridge usage & transaction count
      pipeline.hIncrBy(this.chainTxCountKey, eventData.args.toChainId.toString(), 1);
      pipeline.hIncrBy(this.bridgeUsageKey, eventData.args.bridgeName, 1);

      const [currentTokenVolume, chainTxCount, bridgeUsageCount] = await pipeline.exec();

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
