import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient } from 'redis';
import { SocketBridgeEventLog } from '../../types';
import BigNumber from 'bignumber.js';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { BridgeDataType } from '@prisma/client';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly client;
  readonly tokenVolumeKey = 'bridge_events:total_volume';
  readonly chainTxCountKey = 'bridge_events:transactions_per_chain';
  readonly bridgeUsageKey = 'bridge_events:bridge_usage';
  private logger: Logger = new Logger('RedisService');

  constructor(@InjectQueue('event-queue') private readonly eventQueue: Queue) {
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

  async batchBridgeEventsRedisUpdate(
    eventData: SocketBridgeEventLog,
    normalizedAmount: string,
  ): Promise<{
    updatedTokenVolume: string;
    updatedChainTxCount: string;
    updatedBridgeUseCount: string;
  }> {
    try {
      const tokenField = eventData.args.token;
      const chainField = eventData.args.toChainId.toString();

      // Fetch and update Redis data
      const { currentTokenVolume, chainTxCount, bridgeUsageCount } =
        await this.fetchCurrentRedisData(
          tokenField,
          eventData.args.toChainId.toString(),
          eventData.args.bridgeName,
        );

      const updatedTokenVolume = this.incrementBigNumber(
        currentTokenVolume as string,
        normalizedAmount,
      );
      const updatedChainTxCount = chainTxCount as string;
      const updatedBridgeUseCount = bridgeUsageCount as string;

      // Update Redis and publish events
      await this.updateRedisTokenVolumeAndPublish(
        tokenField,
        updatedTokenVolume,
        chainField,
        updatedChainTxCount,
        eventData.args.bridgeName,
        updatedBridgeUseCount,
      );

      // Format event data and add a job to the queue
      await this.addEventToDatabaseQueue(
        eventData,
        tokenField,
        chainField,
        updatedTokenVolume,
        updatedChainTxCount,
        updatedBridgeUseCount,
      );

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

  private async fetchCurrentRedisData(tokenField: string, chainField: string, bridgeName: string) {
    const pipeline = this.client.multi();

    pipeline.hGet(this.tokenVolumeKey, tokenField);
    pipeline.hIncrBy(this.chainTxCountKey, chainField, 1);
    pipeline.hIncrBy(this.bridgeUsageKey, bridgeName, 1);

    const [currentTokenVolume, chainTxCount, bridgeUsageCount] = await pipeline.exec();

    return { currentTokenVolume, chainTxCount, bridgeUsageCount };
  }

  private async updateRedisTokenVolumeAndPublish(
    tokenField: string,
    updatedTokenVolume: string,
    chainField: string,
    updatedChainTxCount: string,
    bridgeName: string,
    updatedBridgeUseCount: string,
  ) {
    const pipeline = this.client.multi();

    pipeline.hSet(this.tokenVolumeKey, tokenField, updatedTokenVolume);

    pipeline.publish(
      'bridge_events:processed_updates',
      JSON.stringify({
        type: 'token_update',
        token: tokenField,
        totalVolume: updatedTokenVolume,
      }),
    );
    pipeline.publish(
      'bridge_events:processed_updates',
      JSON.stringify({
        type: 'chain_update',
        chainId: chainField,
        totalVolume: updatedChainTxCount,
      }),
    );
    pipeline.publish(
      'bridge_events:processed_updates',
      JSON.stringify({
        type: 'bridge_usage_update',
        bridge: bridgeName,
        usageCount: updatedBridgeUseCount,
      }),
    );

    await pipeline.exec();
  }

  private async addEventToDatabaseQueue(
    eventData: SocketBridgeEventLog,
    tokenField: string,
    chainField: string,
    updatedTokenVolume: string,
    updatedChainTxCount: string,
    updatedBridgeUseCount: string,
  ) {
    const formatedEventData = this.formatBigInt(eventData);

    await this.eventQueue.add('save-event', {
      formatedEventData,
      updates: [
        {
          type: BridgeDataType.TOKEN_VOLUME,
          referenceId: tokenField,
          totalVolume: updatedTokenVolume,
          volumeChange: eventData.args.amount.toString(),
        },
        {
          type: BridgeDataType.CHAIN_VOLUME,
          referenceId: chainField,
          totalVolume: updatedChainTxCount,
          volumeChange: 1,
        },
        {
          type: BridgeDataType.BRIDGE_USE_COUNT,
          referenceId: eventData.args.bridgeName,
          totalVolume: updatedBridgeUseCount,
          volumeChange: 1,
        },
      ],
    });
  }

  private incrementBigNumber(currentValue: string | null, increment: string): string {
    const current = currentValue ? new BigNumber(currentValue) : new BigNumber(0);
    const updated = current.plus(increment);
    return updated.toString();
  }

  private formatBigInt(obj: any): any {
    if (typeof obj === 'bigint') {
      return obj.toString();
    }
    if (Array.isArray(obj)) {
      return obj.map(this.formatBigInt);
    }
    if (obj !== null && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [key, this.formatBigInt(value)]),
      );
    }
    return obj;
  }
}
