import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PrismaService } from '../prisma/prisma.service';
import { QueueProcessor } from './queue.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'event-queue',
    }),
  ],
  providers: [QueueProcessor, PrismaService],
  exports: [BullModule],
})
export class QueueModule {}
