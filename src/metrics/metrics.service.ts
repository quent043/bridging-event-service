import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { SocketBridgeEventLog } from '../../types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MetricsService {
  constructor(
    private readonly redisService: RedisService,
    private readonly prismaService: PrismaService,
  ) {}

  private redisClient = this.redisService.getClient();
  private logger: Logger = new Logger('MetricsService');

  async processBridgeEvent(eventData: SocketBridgeEventLog) {
    this.logger.log('Processing event...');

    const { updatedTokenVolume, updatedChainVolume } =
      await this.redisService.batchBridgeEventsRedisUpdate(eventData);

    const saveRawEventPromise = this.prismaService.saveRawEvent(eventData);

    const saveTokenPromise = this.prismaService.saveProcessedData(
      'token',
      eventData.args.token,
      updatedTokenVolume,
      eventData.args.amount,
    );

    const saveChainPromise = this.prismaService.saveProcessedData(
      'chain',
      eventData.args.toChainId.toString(),
      updatedChainVolume,
      eventData.args.amount,
    );

    await Promise.all([saveRawEventPromise, saveTokenPromise, saveChainPromise]);

    //TODO Not working
    // await this.prismaService.transaction([
    //   this.prismaService.saveRawEvent(eventData),
    // this.prismaService.saveProcessedData(
    //   'token',
    //   eventData.args.token,
    //   updatedTokenVolume,
    //   eventData.args.amount,
    // ),
    // this.prismaService.saveProcessedData(
    //   'chain',
    //   eventData.args.toChainId.toString(),
    //   updatedChainVolume,
    //   eventData.args.amount,
    // ),
    // ]);

    this.logger.log('Event processing complete:', {
      tokenVolume: updatedTokenVolume,
      chainVolume: updatedChainVolume,
    });
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
