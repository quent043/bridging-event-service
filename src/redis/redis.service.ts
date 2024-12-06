import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient } from 'redis';
import { SocketBridgeEventLog } from '../../types';
import BigNumber from 'bignumber.js';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly client;
  readonly tokenVolumeKey = 'bridge_events:total_volume';
  readonly chainVolumeKey = 'bridge_events:volume_by_chain';
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
        await this.client.hSet(this.tokenVolumeKey, 'default', '0');
        this.logger.log(`Initialized ${this.tokenVolumeKey} with default value 0.`);
      }

      // Initialize chain volume key
      const chainVolumeExists = await this.client.exists(this.chainVolumeKey);
      if (!chainVolumeExists) {
        await this.client.hSet(this.chainVolumeKey, 'default', '0');
        this.logger.log(`Initialized ${this.chainVolumeKey} with default value 0.`);
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

  async batchBridgeEventsRedisUpdate(eventData: SocketBridgeEventLog): Promise<{
    updatedTokenVolume: string;
    updatedChainVolume: string;
  }> {
    const pipeline = this.client.multi();

    const tokenField = eventData.args.token;
    const chainField = eventData.args.toChainId.toString();
    const amount = eventData.args.amount.toString();

    try {
      // Fetch current volumes
      pipeline.hGet(this.tokenVolumeKey, tokenField);
      pipeline.hGet(this.chainVolumeKey, chainField);
      const [currentTokenVolume, currentChainVolume] = await pipeline.exec();

      const updatedTokenVolume = this.incrementBigNumber(currentTokenVolume as string, amount);
      const updatedChainVolume = this.incrementBigNumber(currentChainVolume as string, amount);

      // Update volumes and publish events
      const updatePipeline = this.client.multi();
      updatePipeline.hSet(this.tokenVolumeKey, tokenField, updatedTokenVolume);
      updatePipeline.hSet(this.chainVolumeKey, chainField, updatedChainVolume);
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
          totalVolume: updatedChainVolume,
        }),
      );

      await updatePipeline.exec();

      this.logger.log('Batch Redis updates executed successfully', {
        updatedTokenVolume,
        updatedChainVolume,
      });

      return {
        updatedTokenVolume,
        updatedChainVolume,
      };
    } catch (error: any) {
      this.logger.error('Failed to execute batch Redis updates', error.stack || error);
      throw new Error(`RedisService.batchBridgeEventsRedisUpdate failed: ${error.message}`);
    }
  }

  async rollbackRedis(
    eventData: SocketBridgeEventLog,
    updatedTokenVolume: string,
    updatedChainVolume: string,
  ) {
    const pipeline = this.client.multi();

    try {
      const tokenField = eventData.args.token;
      const chainField = eventData.args.toChainId.toString();

      // Convert string volumes to numbers for decrement
      const tokenDecrement = -parseFloat(updatedTokenVolume);
      const chainDecrement = -parseFloat(updatedChainVolume);

      // Revert Redis volumes
      pipeline.hIncrByFloat(this.tokenVolumeKey, tokenField, tokenDecrement);
      pipeline.hIncrByFloat(this.chainVolumeKey, chainField, chainDecrement);

      await pipeline.exec();
      this.logger.log('Redis rollback completed');
    } catch (rollbackError: any) {
      this.logger.error('Failed to rollback Redis changes', rollbackError.stack);
    }
  }
}
