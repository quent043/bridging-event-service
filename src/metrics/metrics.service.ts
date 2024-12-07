import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { SocketBridgeEventLog } from '../../types';
import { BridgeDataType } from '@prisma/client';

@Injectable()
export class MetricsService {
  private redisClient = this.redisService.getClient();
  private readonly logger = new Logger('MetricsService');

  constructor(
    private readonly redisService: RedisService,
    private readonly prismaService: PrismaService,
  ) {}

  async processBridgeEvent(eventData: SocketBridgeEventLog) {
    this.logger.log('Processing event...');

    let updatedTokenVolume = '';
    let updatedChainVolume = '';
    let updatedBridgeUseCount = '';

    try {
      // Step 1: Update Redis
      const redisResult = await this.redisService.batchBridgeEventsRedisUpdate(eventData);

      updatedTokenVolume = redisResult.updatedTokenVolume;
      updatedChainVolume = redisResult.updatedChainVolume;
      updatedBridgeUseCount = redisResult.updatedBridgeUseCount;

      // Step 2: Persist to Database
      await this.persistToDatabase(
        eventData,
        updatedTokenVolume,
        updatedChainVolume,
        updatedBridgeUseCount,
      );

      this.logger.log('Event processed successfully');
    } catch (error: any) {
      this.logger.error('Failed to process bridge event', error.stack);
      throw new Error('Failed to process bridge event with consistency');
    }
  }

  private async persistToDatabase(
    eventData: SocketBridgeEventLog,
    updatedTokenVolume: string,
    updatedChainVolume: string,
    bridgeUseCount: string,
  ) {
    try {
      await this.prismaService.saveProcessedBridgeEventDataBatch(eventData, [
        {
          type: BridgeDataType.TOKEN_VOLUME,
          referenceId: eventData.args.token,
          totalVolume: updatedTokenVolume.toString(),
          volumeChange: eventData.args.amount,
        },
        {
          type: BridgeDataType.CHAIN_VOLUME,
          referenceId: eventData.args.toChainId.toString(),
          totalVolume: updatedChainVolume.toString(),
          volumeChange: eventData.args.amount,
        },
        {
          type: BridgeDataType.BRIDGE_USE_COUNT,
          referenceId: eventData.args.bridgeName,
          totalVolume: bridgeUseCount.toString(),
          volumeChange: 1n,
        },
      ]);
    } catch (error: any) {
      this.logger.error('Failed to persist data to the database', error.stack);
      throw error;
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

  async getBridgeUsageCount(): Promise<Record<string, number>> {
    try {
      const bridgeUsageCounts = await this.redisClient.hGetAll('bridge_events:bridge_usage');
      return Object.fromEntries(
        Object.entries(bridgeUsageCounts).map(([bridgeName, count]) => [bridgeName, Number(count)]),
      );
    } catch (error: any) {
      this.logger.error('Failed to retrieve bridge usage count', error.stack || error);
      throw new Error(`MetricsService.getBridgeUsageCount failed: ${error.message}`);
    }
  }
}
