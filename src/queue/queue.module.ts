import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PrismaService } from '../prisma/prisma.service';
import { QueueProcessor } from './queue.processor';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    }),
    BullModule.registerQueue({
      name: 'event-queue',
    }),
  ],
  providers: [QueueProcessor, PrismaService],
  exports: [BullModule],
})
export class QueueModule {}
