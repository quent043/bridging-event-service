import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { QueueModule } from '../queue/queue.module';

@Module({
  providers: [RedisService],
  imports: [QueueModule],
})
export class RedisModule {}
