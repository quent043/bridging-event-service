import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { SocketBridgeEventLog } from '../../types';
import BigNumber from 'bignumber.js';
import { tokenDecimalsMapping } from '../constants/token-decimals';

@Injectable()
export class MetricsService {
  private redisClient = this.redisService.getClient();
  private readonly logger = new Logger('MetricsService');

  constructor(private readonly redisService: RedisService) {}

  private normalizeAmount(amount: string, decimals: number): BigNumber {
    return new BigNumber(amount).dividedBy(new BigNumber(10).pow(decimals));
  }

  private incrementBigNumber(currentValue: string | null, increment: string): string {
    const current = currentValue ? new BigNumber(currentValue) : new BigNumber(0);
    const updated = current.plus(increment);
    return updated.toString();
  }

  async processBridgeEvent(eventData: SocketBridgeEventLog) {
    this.logger.log('Processing event...');

    try {
      const amount = eventData.args.amount.toString();
      const decimals = tokenDecimalsMapping[eventData.args.token] || 18;
      const normalizedAmount = this.normalizeAmount(amount, decimals).toString();

      const { currentTokenVolume, chainTxCount, bridgeUsageCount } =
        await this.redisService.fetchCurrentRedisData(
          eventData.args.token,
          eventData.args.toChainId.toString(),
          eventData.args.bridgeName,
        );

      const updatedTokenVolume = this.incrementBigNumber(
        currentTokenVolume as string,
        normalizedAmount,
      );
      const updatedChainTxCount = chainTxCount as string;
      const updatedBridgeUseCount = bridgeUsageCount as string;

      await this.redisService.publishAndPersistBridgeEvents(
        eventData,
        updatedTokenVolume,
        updatedChainTxCount,
        updatedBridgeUseCount,
      );

      this.logger.log('Event processed successfully');
    } catch (error: any) {
      this.logger.error('Failed to process bridge event', error.stack);
      throw new Error('Failed to process bridge event with consistency');
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
