import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { validate } from 'bycontract';
import { Redis } from 'ioredis';
import moment from 'moment';
import { RedisService } from 'nestjs-redis';
import { Server, Socket } from 'socket.io';
import { EkConfigService, SUBSCRIBE_CLIENT } from '../config/ek-config.service';
import { logger } from '../utils/default-logger';
import { LayerDto } from './dtos/layer.dto';
import {
  AddLayersEvent,
  ADD_LAYERS,
  CLIENT_CONNECTED,
  CLIENT_DISCONNECTED,
  CLIENT_STATE_CHANGED,
  JoinRoomEvent,
  JOIN_ROOM,
  UPDATE_METADATA,
} from './events';

@WebSocketGateway({ cors: true })
export class SocketsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private eventEmitter: EventEmitter2,
    private configService: EkConfigService,
    redisService: RedisService,
  ) {
    this.pluginId = configService.pluginId;

    this.subscribeClient = redisService.getClient(SUBSCRIBE_CLIENT);

    this.subscribeClient.subscribe(ADD_LAYERS, (err, count) => {
      if (err) {
        throw err;
      }
      logger.log(`SocketsGateway subscribed to the "add-layers" redis message`);
    });

    this.subscribeClient.on('message', (channel, message) => {
      const payload = JSON.parse(message);

      if (channel === ADD_LAYERS) {
        this.handleAddLayersEvent(payload);
      }
    });
  }

  private readonly pluginId: string;
  private readonly subscribeClient: Redis;

  @WebSocketServer()
  private socketServer: Server;

  handleConnection(socket: Socket) {
    logger.log(`Client connected: ${socket.id}`);

    socket.emit(
      UPDATE_METADATA,
      JSON.stringify({
        pluginId: this.configService.pluginId,
        pluginName: this.configService.pluginName,
      }),
    );

    this.eventEmitter.emit(CLIENT_CONNECTED, {
      clientId: socket.id,
    });
  }

  handleDisconnect(socket: Socket) {
    logger.log(`Client disconnected: ${socket.id}`);

    this.eventEmitter.emit(CLIENT_DISCONNECTED, {
      clientId: socket.id,
    });
  }

  @SubscribeMessage(CLIENT_STATE_CHANGED)
  async handleClientStateChangedMessage(client: Socket, payload: any) {
    logger.log(`Received CLIENT_STATE_CHANGED: ${client.id}`);

    this.eventEmitter.emit(CLIENT_STATE_CHANGED, {
      clientId: client.id,
      ...JSON.parse(payload),
    });
  }

  @OnEvent(JOIN_ROOM)
  async handleJoinRoom(joinRoomEvent: JoinRoomEvent) {
    const clientId = validate(joinRoomEvent.clientId, 'string');
    const roomName = validate(joinRoomEvent.roomName, 'string');

    const socket = this.socketServer.sockets.sockets.get(clientId);

    if (!!socket) {
      socket.join(roomName);
      logger.log(`Subscribed client ${clientId} to room #${roomName}`);
    } else {
      logger.warn(
        `Failed to join client ${clientId} to room #${roomName}. Could not find socket`,
      );
    }
  }

  @OnEvent(ADD_LAYERS)
  async handleAddLayersEvent(addLayersEvent: AddLayersEvent) {
    const channelId = validate(addLayersEvent.channelId, 'string');
    const layers = validate(addLayersEvent.layers, 'Array.<object>');

    const now = moment().unix();

    const updatedLayers = layers.map((layer: LayerDto) => ({
      ...layer,
      timestamp: layer.timestamp || now,
    }));

    logger.log(`Emit ADD_LAYERS to ${channelId}`);

    this.socketServer.to(channelId).emit(
      ADD_LAYERS,
      JSON.stringify({
        pluginId: this.pluginId,
        layers: updatedLayers,
      }),
    );
  }
}
