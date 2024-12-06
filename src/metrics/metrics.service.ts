import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { SocketBridgeEventLog } from '../../types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MetricsService {
  private redisClient = this.redisService.getClient();
  private logger: Logger = new Logger('MetricsService');

  constructor(
    private readonly redisService: RedisService,
    private readonly prismaService: PrismaService,
  ) {}

  private redisClient = this.redisService.getClient();
  private logger: Logger = new Logger('MetricsService');

  async processBridgeEvent(eventData: SocketBridgeEventLog) {
    this.logger.log('Processing event...');

    try {
      // Redis operations
      const { updatedTokenVolume, updatedChainVolume } =
        await this.redisService.batchBridgeEventsRedisUpdate(eventData);

      // Database operations
      await Promise.all([
        this.prismaService.saveRawEvent(eventData),
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

      //TODO not working
      // await this.prismaService.transaction([
      //   this.prismaService.saveRawEvent(eventData),
      //   this.prismaService.saveProcessedData(
      //       'token',
      //       eventData.args.token,
      //       updatedTokenVolume,
      //       eventData.args.amount,
      //   ),
      //   this.prismaService.saveProcessedData(
      //       'chain',
      //       eventData.args.toChainId.toString(),
      //       updatedChainVolume,
      //       eventData.args.amount,
      //   ),
      // ]);

      this.logger.log('Event processing complete:', {
        tokenVolume: updatedTokenVolume,
        chainVolume: updatedChainVolume,
      });
    } catch (error: any) {
      this.logger.error('Failed to process bridge event', error.stack || error);
      throw new Error(`MetricsService.processBridgeEvent failed: ${error.message}`);
    }
  }

  async getTotalVolumePerToken(): Promise<Record<string, number>> {
    try {
      const tokenVolumes = await this.redisClient.hGetAll('bridge_events:total_volume');
      return Object.fromEntries(
        Object.entries(tokenVolumes).map(([token, volume]) => [token, Number(volume)]),
      );
    } catch (error: any) {
      this.logger.error('Failed to retrieve total volume per token', error.stack || error);
      throw new Error(`MetricsService.getTotalVolumePerToken failed: ${error.message}`);
    }
  }

  async getTotalVolumeByChain(): Promise<Record<string, number>> {
    try {
      const chainVolumes = await this.redisClient.hGetAll('bridge_events:volume_by_chain');
      return Object.fromEntries(
        Object.entries(chainVolumes).map(([chain, volume]) => [chain, Number(volume)]),
      );
    } catch (error: any) {
      this.logger.error('Failed to retrieve total volume by chain', error.stack || error);
      throw new Error(`MetricsService.getTotalVolumeByChain failed: ${error.message}`);
    }
  }

        return parsedVolumes;
    }
}
