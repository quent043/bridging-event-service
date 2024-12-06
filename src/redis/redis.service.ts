import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient } from 'redis';
import { SocketBridgeEventLog } from '../../types';
import BigNumber from 'bignumber.js';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly client;
  private readonly tokenVolumeKey = 'bridge_events:total_volume';
  private readonly chainVolumeKey = 'bridge_events:volume_by_chain';

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

    // Check and initialize token volume key
    const tokenVolumeExists = await this.client.exists(this.tokenVolumeKey);
    if (!tokenVolumeExists) {
      await this.client.hSet(this.tokenVolumeKey, 'default', '0');
      this.logger.log(`Initialized ${this.tokenVolumeKey} with default value 0.`);
    }

    // Check and initialize chain volume key
    const chainVolumeExists = await this.client.exists(this.chainVolumeKey);
    if (!chainVolumeExists) {
      await this.client.hSet(this.chainVolumeKey, 'default', '0');
      this.logger.log(`Initialized ${this.chainVolumeKey} with default value 0.`);
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
    await this.client.publish(channel, message);
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    const subscriber = this.client.duplicate();
    await subscriber.connect();
    await subscriber.subscribe(channel, message => {
      callback(message);
    });
  }

  convertBigNumber(currentValue: string | null, increment: string): string {
    const current = currentValue ? new BigNumber(currentValue) : new BigNumber(0);
    const updated = current.plus(increment);
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

    // Step 1: Create Fetch current volumes pipeline
    pipeline.hGet(this.tokenVolumeKey, tokenField);
    pipeline.hGet(this.chainVolumeKey, chainField);

    const [currentTokenVolume, currentChainVolume] = await pipeline.exec();

    this.logger.log('currentTokenVolume', currentTokenVolume);
    this.logger.log('currentChainVolume', currentChainVolume);

    const updatedTokenVolume = this.convertBigNumber(currentTokenVolume as string, amount);
    const updatedChainVolume = this.convertBigNumber(currentChainVolume as string, amount);

    this.logger.log('updatedTokenVolume', updatedTokenVolume);
    this.logger.log('updatedChainVolume', updatedChainVolume);

    // Step 2: Create update pipeline
    const updatePipeline = this.client.multi();

    updatePipeline.hSet(this.tokenVolumeKey, tokenField, updatedTokenVolume);
    updatePipeline.hSet(this.tokenVolumeKey, chainField, updatedChainVolume);

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

    this.logger.log('Batch Redis updates executed', {
      updatedTokenVolume,
      updatedChainVolume,
    });

    return {
      updatedTokenVolume,
      updatedChainVolume,
    };
  }
}
