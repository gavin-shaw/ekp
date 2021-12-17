import { logger } from '@app/sdk';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { validate } from 'bycontract';
import _ from 'lodash';
import { Server, Socket } from 'socket.io';
import {
  CLIENT_CONNECTED,
  CLIENT_STATE_CHANGED,
  UpdateMetadataEvent,
  SetLayersEvent,
  UPDATE_METADATA,
  SET_LAYERS,
} from './events';

@WebSocketGateway({ cors: true })
export class SocketsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(private eventEmitter: EventEmitter2) {}

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage(CLIENT_CONNECTED)
  async handleClientConnectedMessage(client: Socket, payload: any) {
    logger.debug(`Received CLIENT_CONNECTED: ${client.id}`);

    this.eventEmitter.emit(CLIENT_CONNECTED, {
      clientId: client.id,
      ...JSON.parse(payload),
    });
  }

  @SubscribeMessage(CLIENT_STATE_CHANGED)
  async handleClientStateChangedMessage(client: Socket, payload: any) {
    logger.debug(`Received CLIENT_STATE_CHANGED: ${client.id}`);

    this.eventEmitter.emit(CLIENT_STATE_CHANGED, {
      clientId: client.id,
      ...JSON.parse(payload),
    });
  }

  @OnEvent(SET_LAYERS)
  async emitSetLayersMessage(updateStorageEvent: SetLayersEvent) {
    validate([updateStorageEvent.clientId], ['string']);

    logger.debug(`Emitting SET_LAYERS: ${updateStorageEvent.clientId}`);

    this.server
      .to(updateStorageEvent.clientId)
      .emit(
        SET_LAYERS,
        JSON.stringify(_.omit(updateStorageEvent, ['clientId'])),
      );
  }

  @OnEvent(UPDATE_METADATA)
  async emitUpdateMetaData(updateMetadataEvent: UpdateMetadataEvent) {
    validate([updateMetadataEvent.clientId], ['string']);

    logger.debug(`Emitting UPDATE_METADATA: ${updateMetadataEvent.clientId}`);

    this.server
      .to(updateMetadataEvent.clientId)
      .emit(
        UPDATE_METADATA,
        JSON.stringify(_.omit(updateMetadataEvent, ['clientId'])),
      );
  }
}
