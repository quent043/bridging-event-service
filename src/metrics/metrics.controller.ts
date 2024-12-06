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

  @Get('total_volume_by_chain')
  async getTotalVolumeByChain() {
    try {
      const result = await this.metricsService.getTotalVolumeByChain();
      return {
        message: 'Total volume by chain retrieved successfully',
        data: result,
      };
    } catch (error: any) {
      throw new HttpException(
        {
          message: 'Failed to retrieve total volume by chain',
          details: error,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
