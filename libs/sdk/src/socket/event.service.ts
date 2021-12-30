import { Injectable } from '@nestjs/common';
import { RedisService } from 'nestjs-redis';
import { PUBLISH_CLIENT } from '../config/ek-config.service';
import { Redis } from 'ioredis';
import { ADD_LAYERS, LayerQueryDto, REMOVE_LAYERS } from './events';
import { LayerDto } from './dtos/layer.dto';

@Injectable()
export class EventService {
  constructor(redisService: RedisService) {
    this.publishClient = redisService.getClient(PUBLISH_CLIENT);
  }

  private readonly publishClient: Redis;

  addLayers(channelId: string, layers: LayerDto[]) {
    this.publishClient.emit(ADD_LAYERS, {
      channelId,
      layers,
    });
  }

  removeLayers(channelId: string, query: LayerQueryDto) {
    this.publishClient.emit(REMOVE_LAYERS, {
      channelId,
      query,
    });
  }
}
