import { Module } from '@nestjs/common';
import { BridgeEventListenerService } from './bridge-event-listener.service';
import {PrismaService} from "../prisma/prisma.service";

@Module({
  providers: [BridgeEventListenerService, PrismaService],
})
export class BridgeEventListenerModule {}
