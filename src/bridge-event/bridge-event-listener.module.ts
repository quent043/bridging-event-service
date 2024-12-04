import { Module } from '@nestjs/common';
import { BridgeEventListenerService } from './bridge-event-listener.service';
import {PrismaService} from "../prisma/prisma.service";
import {RedisService} from "../redis/redis.service";
import {MetricsService} from "../metrics/metrics.service";

@Module({
  providers: [BridgeEventListenerService, PrismaService, RedisService, MetricsService],
})
export class BridgeEventListenerModule {}
