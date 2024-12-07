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

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class MetricsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private logger: Logger = new Logger('MetricsGateway');

  constructor(private readonly redisService: RedisService) {}

  async afterInit() {
    this.logger.log('WebSocket Gateway Initialized');

    await this.redisService.subscribe('bridge_events:processed_updates', (message: any) => {
      const processedData = JSON.parse(message);
      this.broadcastUpdate(processedData);
    });
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  private broadcastUpdate(update: any) {
    switch (update.type) {
      case 'token_update':
        this.server.emit('token_volume_update', {
          token: update.token,
          totalVolume: update.totalVolume,
        });
        break;

      case 'chain_update':
        this.server.emit('chain_volume_update', {
          chainId: update.chainId,
          totalVolume: update.totalVolume,
        });
        break;

      case 'bridge_usage_update':
        this.server.emit('bridge_usage_update', {
          bridge: update.bridge,
          usageCount: update.usageCount,
        });
        break;

      default:
        console.warn(`Unknown update type: ${update.type}`);
    }
  }
}
