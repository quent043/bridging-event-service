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

        const amountAsNumber = Number(eventData.args.amount);

        if (!Number.isSafeInteger(amountAsNumber)) {
            console.warn('Amount exceeds safe integer range, precision might be lost:', eventData.args.amount);
        }

        // Increment the total volume for the token
        await this.redisClient.hIncrBy('bridge_events:total_volume', eventData.args.token, amountAsNumber);

        // Fetch the updated total volume for the token
        const updatedVolume = await this.redisClient.hGet('bridge_events:total_volume', eventData.args.token);

        // Publish the processed data to a Redis channel
        const processedData = {
            token: eventData.args.token,
            totalVolume: updatedVolume,
        };

        await this.redisClient.publish('bridge_events:processed_updates', JSON.stringify(processedData));
        console.log('Published processed data:', processedData);
    }

    /**
     * Get the total volume for all tokens
     * @returns A map of token addresses to their total bridged volume
     */
    async getTotalVolumePerToken(): Promise<Record<string, number>> {
        const tokenVolumes = await this.redisClient.hGetAll('bridge_events:total_volume');
        const parsedVolumes: Record<string, number> = {};

        for (const [token, volume] of Object.entries(tokenVolumes)) {
            parsedVolumes[token] = Number(volume);
        }

        return parsedVolumes;
    }
}
