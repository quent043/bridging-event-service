import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { BridgeDataType, PrismaClient } from '@prisma/client';
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
    type: BridgeDataType,
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

  async saveProcessedBridgeEventDataBatch(
    eventData: SocketBridgeEventLog,
    updates: {
      type: BridgeDataType;
      referenceId: string;
      totalVolume: string;
      volumeChange: bigint;
    }[],
  ): Promise<void> {
    console.log('1');
    const createOperations = updates.map(update =>
      this.processedBridgeData.create({
        data: {
          type: update.type,
          referenceId: update.referenceId,
          totalVolume: update.totalVolume.toString(),
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

    console.log('2');
    await this.$transaction([...createOperations, bridgeEvent]);
    this.logger.log('Batch database updates executed');
  }
}
