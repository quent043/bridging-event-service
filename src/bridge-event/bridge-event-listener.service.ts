import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Log, PublicClient } from 'viem';
import { SocketGatewayABI } from '../../contracts/ABI/SocketGateway';
import { MetricsService } from '../metrics/metrics.service';
import { SocketBridgeEventLog } from '../../types';

@Injectable()
export class BridgeEventListenerService implements OnModuleInit {
  private readonly contractAddress = '0x3a23F943181408EAC424116Af7b7790c94Cb97a5';
  private readonly abi = SocketGatewayABI;

  constructor(
    @Inject('PUBLIC_CLIENT') private publicClient: PublicClient,
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
      //TODO: need other events in ABI  ?
      abi: this.abi,
      eventName,
      onLogs: async (logs: Log[]) => {
        for (const log of logs as unknown as SocketBridgeEventLog[]) {
          console.log('Number of events received:', logs.length);
          console.log(
            'Raw Event Log Received:',
            log.eventName.toString(),
            log.blockNumber?.toString(),
            log.args.amount.toString(),
            log.args.toChainId.toString(),
          );
          try {
            await this.metricsService.processBridgeEvent(log);
          } catch (error) {
            console.error('Failed to process event log:', error);
          }
        }
      },
    });
  }
}

// private async listenToEvents() {
//   const eventName = 'SocketBridge';
//
//   this.publicClient.watchContractEvent({
//     address: this.contractAddress as `0x${string}`,
//     //TODO: need other events in ABI  ?
//     abi: this.abi,
//     eventName,
//     onLogs: async (logs: Log[]) => {
//       for (const log of logs as unknown as SocketBridgeEventLog[]) {
//         console.log('Number of events received:', logs.length);
//         console.log(
//             'Raw Event Log Received:',
//             log.eventName.toString(),
//             log.blockNumber?.toString(),
//             log.args.amount.toString(),
//             log.args.toChainId.toString(),
//         );
//         try {
//           await this.metricsService.processBridgeEvent(log);
//         } catch (error) {
//           console.error('Failed to process event log:', error);
//         }
//       }
//     },
//   });
// }
// }
//
// optimise here with promise all in the loop
