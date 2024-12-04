import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import {createPublicClient, http, PublicClient} from 'viem';
import {ethers, Log} from 'ethers';
// import redisClient from '../redis-client';
import {mainnet} from "viem/chains";
import {SocketGatewayABI} from "../../contracts/ABI/SocketGateway";
import {RedisService} from "../redis/redis.service";
import {MetricsService} from "../metrics/metrics.service";

@Injectable()
export class BridgeEventListenerService implements OnModuleInit {
    private readonly contractAddress = '0x3a23F943181408EAC424116Af7b7790c94Cb97a5';
    private readonly abi = SocketGatewayABI;

    constructor(
        @Inject('PUBLIC_CLIENT') private publicClient: PublicClient,
        private readonly redisService: RedisService,
        private readonly metricsService: MetricsService,
    ) {}

    async onModuleInit() {
        console.log('Initializing event listener...');
        this.listenToEvents();
    }

    private async listenToEvents() {
        const eventName = 'SocketBridge';

        this.publicClient.watchContractEvent({
            address: this.contractAddress as `0x${string}`,
            abi: this.abi,
            eventName,
            onLogs: async (logs) => {
                for (const log of logs) {
                    console.log('Event received:', log);

                    // TODO: Check what data to push to the queue
                    await this.metricsService.processBridgeEvent(log);
                    //TODO chépa si ça sert ça
                    await this.redisService.publish('bridge_events', JSON.stringify(log));
                }
            },
        });
    }
}
