import { Module } from '@nestjs/common';
import { DataCollectorService } from './data-collector.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MetricsService } from '../metrics/metrics.service';

@Module({
  providers: [DataCollectorService, PrismaService, RedisService, MetricsService],
})
export class DataCollectorModule {}
