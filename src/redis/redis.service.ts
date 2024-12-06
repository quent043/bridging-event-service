import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient } from 'redis';
import { SocketBridgeEventLog } from '../../types';
import BigNumber from 'bignumber.js';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly client;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    this.client.on('error', err => {
      console.error('Redis Client Error:', err);
    });
  }

  async onModuleInit() {
    await this.client.connect();
    console.log('Redis connected');
  }

  async onModuleDestroy() {
    await this.client.disconnect();
    console.log('Redis disconnected');
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

  // Private function to handle BigNumber operations with Redis
  async incrementBigNumberInHash(hashKey: string, field: string, amount: string): Promise<string> {
    const currentVolumeStr = await this.client.hGet(hashKey, field);
    const currentVolume = currentVolumeStr ? new BigNumber(currentVolumeStr) : new BigNumber(0);
    const updatedVolume = currentVolume.plus(amount);

    await this.client.hSet(hashKey, field, updatedVolume.toString());

    console.log(`Updated ${hashKey} [${field}]: ${updatedVolume.toString()}`);

    return updatedVolume.toString();
  }
}
