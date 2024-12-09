import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { DataCollectorModule } from './data-collector/data-collector.module';
import { ViemModule } from './viem/viem.module';
import { MetricsModule } from './metrics/metrics.module';
import { RedisModule } from './redis/redis.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [PrismaModule, DataCollectorModule, ViemModule, MetricsModule, RedisModule, QueueModule],
})
export class AppModule {}
