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

  //TODO: Implement pipelines for redis
  async processBridgeEvent(eventData: SocketBridgeEventLog) {
    console.log('Processing event...');

    const saveRawEventPromise = this.prismaService.saveRawEvent(eventData);

    const updatedTokenVolumePromise = this.incrementBigNumberInHash(
      'bridge_events:total_volume',
      eventData.args.token,
      eventData.args.amount.toString(),
    );

    const updatedChainVolumePromise = this.incrementBigNumberInHash(
      'bridge_events:volume_by_chain',
      eventData.args.toChainId.toString(),
      eventData.args.amount.toString(),
    );

    const addSenderPromise = this.redisClient.sAdd(
      'bridge_events:active_users',
      eventData.args.sender,
    );

    const [updatedTokenVolume, updatedChainVolume] = await Promise.all([
      updatedTokenVolumePromise,
      updatedChainVolumePromise,
    ]);

    const publishPromises = Promise.all([
      this.redisService.publish(
        'bridge_events:processed_updates',
        JSON.stringify({
          type: 'token_update',
          token: eventData.args.token,
          totalVolume: updatedTokenVolume,
        }),
      ),
      this.redisService.publish(
        'bridge_events:processed_updates',
        JSON.stringify({
          type: 'chain_update',
          chainId: eventData.args.toChainId.toString(),
          totalVolume: updatedChainVolume,
        }),
      ),
    ]);

    const saveProcessedDataPromises = Promise.all([
      this.prismaService.saveProcessedData(
        'token',
        eventData.args.token,
        updatedTokenVolume,
        eventData.args.amount,
      ),
      this.prismaService.saveProcessedData(
        'chain',
        eventData.args.toChainId.toString(),
        updatedChainVolume,
        eventData.args.amount,
      ),
    ]);

    await Promise.all([
      saveRawEventPromise,
      addSenderPromise,
      publishPromises,
      saveProcessedDataPromises,
    ]);

    console.log('Published updates for token and chain volumes');
  }

  //TODO: Belongs in redis utils
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
