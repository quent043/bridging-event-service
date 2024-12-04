import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RedisService } from '../redis/redis.service';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: true })
export class MetricsGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private redisSubscriber: any;
  private logger: Logger = new Logger('MetricsGateway');

  constructor(private readonly redisService: RedisService) {}

  async afterInit() {
    this.logger.log('WebSocket Gateway Initialized');

    this.redisSubscriber = this.redisService.getClient().duplicate();
    await this.redisSubscriber.connect();

    await this.redisSubscriber.subscribe(
        'bridge_events:processed_updates',
        (message: any) => {
          const processedData = JSON.parse(message);
          this.broadcastUpdate(processedData);
        },
    );
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  private broadcastUpdate(data: { token: string; totalVolume: string }) {
    this.logger.log('Broadcasting update to clients:', data);
    this.server.emit('bridge_event_update', data);
  }
}
