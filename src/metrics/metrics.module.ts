import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import {RedisService} from "../redis/redis.service";
import { MetricsController } from './metrics.controller';
import { MetricsGateway } from './metrics.gateway';

@Module({
  providers: [MetricsService, RedisService, MetricsGateway],
  controllers: [MetricsController]
})
export class MetricsModule {}
