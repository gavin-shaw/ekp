import { Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ServerStateEvent } from './event/server-state.event';

@WebSocketGateway({ cors: true })
export class DefaultGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(private eventEmitter: EventEmitter2) {}

  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('AppGateway');

  afterInit() {
    this.logger.log('Initialized .....');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('client-state')
  async handleClientState(client: Socket, payload: any) {
    const state = JSON.parse(payload);

    this.eventEmitter.emit('client-state', {
      clientId: client.id,
      state,
    });
  }

  @OnEvent('server-state')
  handleServerState(event: ServerStateEvent) {
    this.logger.log('Emitting server state event', {
      clientId: event.clientId,
    });
    this.server
      .to(event.clientId)
      .emit('server-state', JSON.stringify(event.state));
  }
}
