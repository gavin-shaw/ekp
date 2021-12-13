import {
  CLIENT_CONNECTED,
  CLIENT_STATE_CHANGED,
  UpdateMetadataEvent,
  UpdateStorageEvent,
  UPDATE_METADATA,
  UPDATE_STORAGE,
} from './events';
import { Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { validate } from 'bycontract';
import _ from 'lodash';

@WebSocketGateway({ cors: true })
export class SocketsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(private eventEmitter: EventEmitter2) {}

  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('SocketsGateway');

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage(CLIENT_CONNECTED)
  async handleClientConnectedMessage(client: Socket, payload: any) {
    this.logger.debug(`Received CLIENT_CONNECTED: ${client.id}`);

    this.eventEmitter.emit(CLIENT_CONNECTED, {
      clientId: client.id,
      ...JSON.parse(payload),
    });
  }

  @SubscribeMessage(CLIENT_STATE_CHANGED)
  async handleClientStateChangedMessage(client: Socket, payload: any) {
    this.logger.debug(`Received CLIENT_STATE_CHANGED: ${client.id}`);

    this.eventEmitter.emit(CLIENT_STATE_CHANGED, {
      clientId: client.id,
      ...JSON.parse(payload),
    });
  }

  @OnEvent(UPDATE_STORAGE)
  async emitUpdateStorageMessage(updateStorageEvent: UpdateStorageEvent) {
    validate([updateStorageEvent.clientId], ['string']);

    this.logger.debug(
      `Emitting UPDATE_STORAGE: ${updateStorageEvent.clientId}`,
    );

    this.server
      .to(updateStorageEvent.clientId)
      .emit(
        UPDATE_STORAGE,
        JSON.stringify(_.omit(updateStorageEvent, ['clientId'])),
      );
  }

  @OnEvent(UPDATE_METADATA)
  async emitUpdateMetaData(updateMetadataEvent: UpdateMetadataEvent) {
    validate([updateMetadataEvent.clientId], ['string']);

    this.logger.debug(
      `Emitting UPDATE_METADATA: ${updateMetadataEvent.clientId}`,
    );

    this.server
      .to(updateMetadataEvent.clientId)
      .emit(
        UPDATE_METADATA,
        JSON.stringify(_.omit(updateMetadataEvent, ['clientId'])),
      );
  }
}
