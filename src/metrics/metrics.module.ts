import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import {RedisService} from "../redis/redis.service";

@Module({
  providers: [MetricsService, RedisService]
})
export class MetricsModule {}
