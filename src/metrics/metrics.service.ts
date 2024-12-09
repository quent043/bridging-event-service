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
    let updatedChainTransactionCount = '';
    let updatedBridgeUseCount = '';

    try {
      // Step 1: Update Redis
      const redisResult = await this.redisService.batchBridgeEventsRedisUpdate(eventData);

      //TODO a delete
      // updatedTokenVolume = redisResult.updatedTokenVolume;
      // updatedChainTransactionCount = redisResult.updatedChainTxCount;
      // updatedBridgeUseCount = redisResult.updatedBridgeUseCount;
      //
      // // Step 2: Persist to Database
      // await this.persistToDatabase(
      //   eventData,
      //   updatedTokenVolume,
      //   updatedChainTransactionCount,
      //   updatedBridgeUseCount,
      // );
      //
      // this.logger.log('Event processed successfully');
    } catch (error: any) {
      this.logger.error('Failed to process bridge event', error.stack);
      throw new Error('Failed to process bridge event with consistency');
    }
  }

  private async persistToDatabase(
    eventData: SocketBridgeEventLog,
    updatedTokenVolume: string,
    updatedChainTsCount: string,
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
          totalVolume: updatedChainTsCount.toString(),
          volumeChange: 1n,
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

  async getTotalTransactionCountByChain(): Promise<Record<string, number>> {
    try {
      const chainVolumes = await this.redisClient.hGetAll('bridge_events:transactions_per_chain');
      return Object.fromEntries(
        Object.entries(chainVolumes).map(([chain, volume]) => [chain, Number(volume)]),
      );
    } catch (error: any) {
      this.logger.error(
        'Failed to retrieve total transaction count by chain',
        error.stack || error,
      );
      throw new Error(`MetricsService.getTotalTransactionCountByChain failed: ${error.message}`);
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
