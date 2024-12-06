import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Log, PublicClient } from 'viem';
import { SocketGatewayABI } from '../../contracts/ABI/SocketGateway';
import { MetricsService } from '../metrics/metrics.service';
import { SocketBridgeEventLog } from '../../types';

@Injectable()
export class BridgeEventListenerService implements OnModuleInit {
  private readonly contractAddress = '0x3a23F943181408EAC424116Af7b7790c94Cb97a5';
  private readonly abi = SocketGatewayABI;

  private logger: Logger = new Logger('BridgeEventListenerService');

  constructor(
    @Inject('PUBLIC_CLIENT') private publicClient: PublicClient,
    private readonly metricsService: MetricsService,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing event listener...');
    this.listenToEvents();
  }

  private async listenToEvents() {
    const eventName = 'SocketBridge';

    this.publicClient.watchContractEvent({
      address: this.contractAddress as `0x${string}`,
      abi: this.abi,
      eventName,
      onLogs: async (logs: Log[]) => {
        this.logger.log('Number of events received:', logs.length);

        try {
          await Promise.all(
            logs.map(async (log: Log) => {
              const socketLog = log as unknown as SocketBridgeEventLog;
              this.logger.log(
                'Raw Event Log Received:',
                socketLog.eventName.toString(),
                socketLog.blockNumber?.toString(),
                socketLog.args.amount.toString(),
                socketLog.args.toChainId.toString(),
              );
              await this.metricsService.processBridgeEvent(socketLog);
            }),
          );
        } catch (error) {
          this.logger.error('Failed to process one or more event logs:', error);
        }
      },
    });
  }
}
