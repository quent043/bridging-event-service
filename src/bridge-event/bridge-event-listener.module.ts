import { Module } from '@nestjs/common';
import { BridgeEventListenerService } from './bridge-event-listener.service';
import {PrismaService} from "../prisma/prisma.service";
import {RedisService} from "../redis/redis.service";

@Module({
  providers: [BridgeEventListenerService, PrismaService, RedisService],
})
export class BridgeEventListenerModule {}
