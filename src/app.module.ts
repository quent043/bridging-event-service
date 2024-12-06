import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { BridgeEventListenerModule } from './bridge-event/bridge-event-listener.module';
import { ViemModule } from './viem/viem.module';
import { MetricsModule } from './metrics/metrics.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [PrismaModule, BridgeEventListenerModule, ViemModule, MetricsModule, RedisModule],
})
export class AppModule {}
