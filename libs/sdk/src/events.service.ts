import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { WebSocketServer } from '@nestjs/websockets';
import { validate } from 'bycontract';
import moment from 'moment';
import { Server } from 'socket.io';
import { CLIENT_PROXY, EkConfigService } from './config/ek-config.service';
import { LayerDto } from './sockets/dtos/layer.dto';
import { ADD_LAYERS } from './sockets/events/add-layers.event';

@Injectable()
export class EventsService {
  constructor(
    @Inject(CLIENT_PROXY) private client: ClientProxy,
    configService: EkConfigService,
  ) {
    this.pluginId = configService.pluginId;
  }

  @WebSocketServer()
  private socketServer: Server;

  private readonly pluginId: string;

  emitLayers(clientId: string, layers: LayerDto[]) {
    this.broadcastLayers(clientId, layers);
  }

  broadcastLayers(channelId: string, layers: LayerDto[]) {
    validate([channelId, layers], ['string', 'Array.<object>']);

    const now = moment().unix();

    const updatedLayers = layers.map((layer) => ({
      ...layer,
      timestamp: layer.timestamp || now,
    }));

    this.socketServer.to(channelId).emit(
      ADD_LAYERS,
      JSON.stringify({
        pluginId: this.pluginId,
        layers: updatedLayers,
      }),
    );
  }
}
