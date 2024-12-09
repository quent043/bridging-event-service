import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { SocketBridgeEventLog } from '../../types';

@Processor('event-queue')
export class QueueProcessor {
  constructor(private readonly prismaService: PrismaService) {}

  @Process('save-event')
  async handleSaveEvent(job: Job<{ formatedEventData: SocketBridgeEventLog; updates: any }>) {
    const { formatedEventData, updates } = job.data;

    try {
      // Save raw and processed event to DB
      await this.prismaService.saveProcessedBridgeEventDataBatch(formatedEventData, updates);

      console.log('Event data persisted successfully');
    } catch (error) {
      console.error('Failed to process save-event job:', error);
      throw error;
    }
  }
}
