import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import BigNumber from 'bignumber.js';
import { SocketBridgeEventLog } from '../../types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MetricsService {
  constructor(
    private readonly redisService: RedisService,
    private readonly prismaService: PrismaService,
  ) {}

  private redisClient = this.redisService.getClient();

  //TODO: type event & Batch promisse.all
  // Process an incoming bridging event
  async processBridgeEvent(eventData: SocketBridgeEventLog) {
    console.log('Processing event...');

    await this.prismaService.saveRawEvent(eventData);

    // Increment the total volume for the token
    const updatedTokenVolume = await this.incrementBigNumberInHash(
      'bridge_events:total_volume',
      eventData.args.token,
      eventData.args.amount.toString(),
    );

    // Increment the total volume by chain
    const updatedChainVolume = await this.incrementBigNumberInHash(
      'bridge_events:volume_by_chain',
      eventData.args.toChainId.toString(),
      eventData.args.amount.toString(),
    );

    // Add sender to active users
    await this.redisClient.sAdd('bridge_events:active_users', eventData.args.sender);

    await this.redisService.publish(
      'bridge_events:processed_updates',
      JSON.stringify({
        type: 'token_update',
        token: eventData.args.token,
        totalVolume: updatedTokenVolume,
      }),
    );

    await this.redisService.publish(
      'bridge_events:processed_updates',
      JSON.stringify({
        type: 'chain_update',
        chainId: eventData.args.toChainId.toString(),
        totalVolume: updatedChainVolume,
      }),
    );

    await this.prismaService.saveProcessedData(
      'token',
      eventData.args.token,
      null,
      updatedTokenVolume,
      eventData.args.amount,
    );

    await this.prismaService.saveProcessedData(
      'chain',
      eventData.args.toChainId.toString(),
      null,
      updatedChainVolume,
      eventData.args.amount,
    );

    console.log('Published updates for token and chain volumes');
  }

  // Private function to handle BigNumber operations with Redis
  private async incrementBigNumberInHash(
    hashKey: string,
    field: string,
    amount: string,
  ): Promise<string> {
    const currentVolumeStr = await this.redisClient.hGet(hashKey, field);
    const currentVolume = currentVolumeStr ? new BigNumber(currentVolumeStr) : new BigNumber(0);
    const updatedVolume = currentVolume.plus(amount);

    await this.redisClient.hSet(hashKey, field, updatedVolume.toString());

    console.log(`Updated ${hashKey} [${field}]: ${updatedVolume.toString()}`);

    return updatedVolume.toString();
  }

  // Get the total volume for all tokens
  async getTotalVolumePerToken(): Promise<Record<string, number>> {
    const tokenVolumes = await this.redisClient.hGetAll('bridge_events:total_volume');
    return Object.fromEntries(
      Object.entries(tokenVolumes).map(([token, volume]) => [token, Number(volume)]),
    );
  }

  // Get the total volume by destination chain
  async getTotalVolumeByChain(): Promise<Record<string, number>> {
    const chainVolumes = await this.redisClient.hGetAll('bridge_events:volume_by_chain');
    return Object.fromEntries(
      Object.entries(chainVolumes).map(([chain, volume]) => [chain, Number(volume)]),
    );
  }

        return parsedVolumes;
    }
}
