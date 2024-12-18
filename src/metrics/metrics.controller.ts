import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('total_volume')
  async getTotalVolume() {
    try {
      const result = await this.metricsService.getTotalVolumePerToken();
      return {
        message: 'Total volume retrieved successfully',
        data: result,
      };
    } catch (error: any) {
      throw new HttpException(
        {
          message: 'Failed to retrieve total volume per token',
          details: error,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('total_transactions_by_chain')
  async getTotalVolumeByChain() {
    try {
      const result = await this.metricsService.getTotalTransactionCountByChain();
      return {
        message: 'Total transaction count by chain retrieved successfully',
        data: result,
      };
    } catch (error: any) {
      throw new HttpException(
        {
          message: 'Failed to retrieve total transaction count by chain',
          details: error,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('bridge_usage_count')
  async getBridgeUsageCount() {
    try {
      const result = await this.metricsService.getBridgeUsageCount();
      return {
        message: 'Bridge usage count retrieved successfully',
        data: result,
      };
    } catch (error: any) {
      throw new HttpException(
        {
          message: 'Failed to retrieve bridge usage count',
          details: error,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
