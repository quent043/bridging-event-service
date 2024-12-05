import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { RedisService } from '../redis/redis.service';
import { MetricsController } from './metrics.controller';
import { MetricsGateway } from './metrics.gateway';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [MetricsService, RedisService, MetricsGateway, PrismaService],
  controllers: [MetricsController],
})
export class MetricsModule {}
