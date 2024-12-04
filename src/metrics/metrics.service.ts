import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import {SocketBridgeEventLog} from "../../types";

@Injectable()
export class MetricsService {
    constructor(private readonly redisService: RedisService) {}

    private redisClient = this.redisService.getClient();

    //TODO: type event & Batch promisse.all
    async processBridgeEvent(eventData: SocketBridgeEventLog) {
        console.log('Processing event:', eventData);

        // Aggregate metrics in Redis
        const timestamp = Date.now();

        // Add the event's amount with a timestamp to a sorted set
        await this.redisClient.zAdd('bridge_events:amounts', {
            score: timestamp,
            value: eventData.args.amount.toString(),
        });

        // Increment the volume of the token in a hash
        const amountAsNumber = Number(eventData.args.amount);

        if (!Number.isSafeInteger(amountAsNumber)) {
            console.warn('Amount exceeds safe integer range, precision might be lost:', eventData.args.amount);
        }

        await this.redisClient.hIncrBy('bridge_events:top_tokens', eventData.args.token, amountAsNumber);

        console.log('Event processed and metrics updated.');
    }
}
