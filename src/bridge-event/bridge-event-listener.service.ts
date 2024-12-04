import {Inject, Injectable, OnModuleInit} from '@nestjs/common';
import {decodeEventLog, PublicClient} from 'viem';
import {SocketGatewayABI} from "../../contracts/ABI/SocketGateway";
import {RedisService} from "../redis/redis.service";
import {MetricsService} from "../metrics/metrics.service";
import {SocketBridgeEventLog} from "../../types";

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
                    try {
                        // Decode the raw log
                        const decodedLog = decodeEventLog({
                            abi: this.abi,
                            data: log.data,
                            topics: log.topics,
                        });

                        if (decodedLog.eventName === 'SocketBridge' && decodedLog.args) {
                            // Narrow down the type of decodedLog.args
                            const args = decodedLog.args as unknown as {
                                amount: bigint;
                                token: string;
                                toChainId: bigint;
                                bridgeName: string;
                                sender: string;
                                receiver: string;
                                metadata: string;
                            };

                            // Augment the log with decoded information
                            const typedLog = {
                                ...log,
                                eventName: decodedLog.eventName,
                                args,
                            };

                            console.log('Decoded Event:', typedLog);
                        }

                    // TODO: Check what data to push to the queue
                    await this.metricsService.processBridgeEvent(log);
                    //TODO chépa si ça sert ça
                    await this.redisService.publish('bridge_events', JSON.stringify(log));
                } catch (error) {
                        console.error('Failed to decode event log:', error);
                    }
            },
        });
    }
}
