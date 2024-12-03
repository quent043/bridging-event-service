import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { BridgeEventListenerModule } from './bridge-event/bridge-event-listener.module';
import { ViemModule } from './viem/viem.module';

@Module({
  imports: [PrismaModule, BridgeEventListenerModule, ViemModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
