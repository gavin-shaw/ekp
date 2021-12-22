import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { CLIENT_PROXY, EkConfigService } from '../config/ek-config.service';
import { logger } from '../utils/default-logger';
import {
  CLIENT_CONNECTED,
  CLIENT_DISCONNECTED,
  CLIENT_STATE_CHANGED,
  UPDATE_METADATA,
} from './events';

@WebSocketGateway(3001, { cors: true })
export class SocketsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    @Inject(CLIENT_PROXY) private microservice: ClientProxy,
    private configService: EkConfigService,
  ) {}

  handleConnection(socket: Socket) {
    logger.log(`Client connected: ${socket.id}`);

    socket.emit(UPDATE_METADATA, {
      pluginId: this.configService.pluginId,
      pluginName: this.configService.pluginName,
    });

    this.microservice.emit(CLIENT_CONNECTED, {
      clientId: socket.id,
    });
  }

  handleDisconnect(socket: Socket) {
    logger.log(`Client disconnected: ${socket.id}`);

    this.microservice.emit(CLIENT_DISCONNECTED, {
      clientId: socket.id,
    });
  }

  @SubscribeMessage(CLIENT_STATE_CHANGED)
  async handleClientStateChangedMessage(client: Socket, payload: any) {
    logger.log(`Received CLIENT_STATE_CHANGED: ${client.id}`);

    this.microservice.emit(CLIENT_STATE_CHANGED, {
      clientId: client.id,
      ...JSON.parse(payload),
    });
  }
}
