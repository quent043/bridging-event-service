import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SocketBridgeEventLog } from '../../types';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  //TODO use ?
  private supabase: SupabaseClient;

  constructor() {
    super();
    this.supabase = createClient(
      //TODO Add checks on these
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_KEY as string,
    );
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async saveRawEvent(eventData: SocketBridgeEventLog) {
    await this.bridgeEvent.create({
      data: {
        amount: eventData.args.amount.toString(),
        token: eventData.args.token,
        toChainId: Number(eventData.args.toChainId),
        bridgeName: eventData.args.bridgeName,
        sender: eventData.args.sender,
        receiver: eventData.args.receiver,
        metadata: eventData.args.metadata,
        blockNumber: eventData.blockNumber?.toString() || '0',
        transactionhash: eventData.transactionHash,
      },
    });
    console.log('Raw event persisted to database.');
  }

  async saveProcessedData(
    type: 'token' | 'chain',
    referenceId: string,
    totalVolume: string,
    volumeChange: bigint,
  ) {
    await this.processedBridgeData.create({
      data: {
        type,
        referenceId,
        totalVolume: totalVolume.toString(),
        volumeChange: volumeChange.toString(),
      },
    });
    console.log(`Processed data persisted: ${type} - ${referenceId}`);
  }
}
