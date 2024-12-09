import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { SocketBridgeEventLog } from '../../types';

@Processor('event-queue')
export class QueueProcessor {
  constructor(private readonly prismaService: PrismaService) {}

  @Process('save-event')
  async handleSaveEvent(job: Job<{ eventData: SocketBridgeEventLog; updates: any }>) {
    const { eventData, updates } = job.data;

    // Save raw and processed event to DB
    await this.prismaService.saveProcessedBridgeEventDataBatch(eventData, updates);
    console.log('Event data persisted successfully');
  }
}
