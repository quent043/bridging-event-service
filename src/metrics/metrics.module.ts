import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { RedisService } from '../redis/redis.service';
import { MetricsController } from './metrics.controller';
import { MetricsGateway } from './metrics.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { QueueModule } from '../queue/queue.module';

@Module({
  providers: [MetricsService, RedisService, MetricsGateway, PrismaService],
  controllers: [MetricsController],
  imports: [QueueModule],
})
export class MetricsModule {}
