import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { SocketBridgeEventLog } from '../../types';
import { Logger } from '@nestjs/common';
import { MetricsService } from '../metrics/metrics.service';

@Processor('event-queue')
export class QueueProcessor {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly metricsService: MetricsService,
  ) {}

  private logger: Logger = new Logger('QueueProcessor');

  @Process('save-event')
  async handleSaveEvent(job: Job<{ formatedEventData: SocketBridgeEventLog; updates: any }>) {
    const { formatedEventData, updates } = job.data;

    try {
      this.logger.log('Persisting event data...');
      await this.prismaService.saveProcessedBridgeEventDataBatch(formatedEventData, updates);
      this.logger.log('Event data persisted successfully');
    } catch (error) {
      console.error('Failed to process save-event job:', error);
      throw error;
    }
  }

  @Process('process-event-metrics')
  async handleProcessEventMetrics(job: Job<{ formatedEventData: SocketBridgeEventLog }>) {
    const { formatedEventData } = job.data;
    try {
      this.logger.log('Processing event metrics...');
      await this.metricsService.processBridgeEvent(formatedEventData);
      this.logger.log('Metrics processed successfully');
    } catch (error) {
      this.logger.error('Failed to process metrics job:', error);
      throw error;
    }
  }
}
