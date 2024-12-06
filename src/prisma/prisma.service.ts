import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { SocketBridgeEventLog } from '../../types';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private logger: Logger = new Logger('PrismaService');

  constructor() {
    super();
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async saveRawEvent(eventData: SocketBridgeEventLog) {
    this.logger.log('Persisting Raw event.');
    return this.bridgeEvent.create({
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
  }

  async saveProcessedData(
    type: 'token' | 'chain',
    referenceId: string,
    totalVolume: string,
    volumeChange: bigint,
  ) {
    this.logger.log(`Persisting data: ${type} - ${referenceId}`);
    return this.processedBridgeData.create({
      data: {
        type,
        referenceId,
        totalVolume: totalVolume.toString(),
        volumeChange: volumeChange.toString(),
      },
    });
  }

  async saveProcessedDataBatch(
    eventData: SocketBridgeEventLog,
    updates: {
      type: 'token' | 'chain';
      referenceId: string;
      totalVolume: string;
      volumeChange: bigint;
    }[],
  ): Promise<void> {
    const createOperations = updates.map(update =>
      this.processedBridgeData.create({
        data: {
          type: update.type,
          referenceId: update.referenceId,
          totalVolume: update.totalVolume,
          volumeChange: update.volumeChange.toString(),
        },
      }),
    );
    const bridgeEvent = this.bridgeEvent.create({
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

    await this.$transaction([...createOperations, bridgeEvent]);
    this.logger.log('Batch database updates executed');
  }

  //TODO type this correctly
  async transaction(operations: any[]): Promise<any[]> {
    this.logger.log('Persisting transaction');
    return this.$transaction(operations);
  }
}
