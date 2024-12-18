import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PrismaService } from '../prisma/prisma.service';
import { QueueProcessor } from './queue.processor';
import { MetricsService } from '../metrics/metrics.service';
import { RedisService } from '../redis/redis.service';

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
  providers: [QueueProcessor, PrismaService, MetricsService, RedisService],
  exports: [BullModule],
})
export class QueueModule {}
