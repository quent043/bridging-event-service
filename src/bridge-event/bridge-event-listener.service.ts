import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import {createPublicClient, http, PublicClient} from 'viem';
import { ethers } from 'ethers';
// import redisClient from '../redis-client';
import {mainnet} from "viem/chains";
import {SocketGatewayABI} from "../../contracts/ABI/SocketGateway";

@Injectable()
export class BridgeEventListenerService implements OnModuleInit {
    // private publicClient: PublicClient;
    private contractAddress = '0x3a23F943181408EAC424116Af7b7790c94Cb97a5';
    private abi = SocketGatewayABI;

    constructor(@Inject('PUBLIC_CLIENT') private publicClient: PublicClient) {}


    async onModuleInit() {

        // Begin listening to events
        console.log('listenToEvents...')
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

                    // Publish the event to Redis for processing
                    // await redisClient.publish('bridge_events', JSON.stringify(log.args));
                }
            },
        });
    }
}
