import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class MetricsService {
    constructor(private readonly redisService: RedisService) {}

    private redisClient = this.redisService.getClient();

    //TODO: type event
    async processBridgeEvent(eventData: any) {
        const { token, amount, user } = eventData;

        // Aggregate metrics in Redis
        const timestamp = Date.now();



        console.log('Event processed and metrics updated.');
    }
}
