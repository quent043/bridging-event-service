import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Log, PublicClient } from 'viem';
import { SocketGatewayABI } from '../../contracts/ABI/SocketGateway';
import { MetricsService } from '../metrics/metrics.service';
import { SocketBridgeEventLog } from '../../types';

//TODO: Decouple the event listener from the metrics service, link with redis queues
@Injectable()
export class DataCollectorService implements OnModuleInit {
  private readonly contractAddress = '0x3a23F943181408EAC424116Af7b7790c94Cb97a5';
  private readonly abi = SocketGatewayABI;

  private logger: Logger = new Logger('BridgeEventListenerService');
  private maxRetries = 5;

  constructor(
    @Inject('PUBLIC_CLIENT') private publicClient: PublicClient,
    private readonly metricsService: MetricsService,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing event listener...');
    await this.listenToEventsWithRetry();
  }

  //TODO handle the watchcontract fail event
  private async listenToEvents() {
    const eventName = 'SocketBridge';

    this.publicClient.watchContractEvent({
      address: this.contractAddress as `0x${string}`,
      abi: this.abi,
      eventName,
      onLogs: async (logs: Log[]) => {
        this.logger.log(`Number of events received: ${logs.length}`);

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

  private async listenToEventsWithRetry() {
    let attempt = 0;

    while (attempt < this.maxRetries) {
      try {
        this.logger.log(`Attempt ${attempt + 1}: Starting event listener...`);
        await this.listenToEvents();
        this.logger.log('Event listener started successfully');
        break;
      } catch (error) {
        attempt++;
        const delay = this.getExponentialBackoffDelay(attempt);
        this.logger.error(
          `Attempt ${attempt} failed. Retrying in ${delay / 1000} seconds...`,
          error,
        );
        if (attempt < this.maxRetries) {
          await this.sleep(delay);
        } else {
          this.logger.error('Max retries reached. Event listener failed to start.');
          throw new Error('Event listener initialization failed after maximum retries.');
        }
      }
    }
  }

  private getExponentialBackoffDelay(attempt: number): number {
    const baseDelay = 1000;
    const maxDelay = 30000;
    return Math.min(baseDelay * 2 ** attempt, maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
