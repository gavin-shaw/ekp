import {
  ADD_LAYERS,
  ClientStateChangedEvent,
  CLIENT_STATE_CHANGED,
  LayerDto,
} from '@app/sdk';
import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { validate } from 'bycontract';
import moment from 'moment';
import { homeElement } from './elements/home/home.element';

@Injectable()
export class UiClientService {
  constructor(private eventEmitter: EventEmitter2) {}

  @OnEvent(CLIENT_STATE_CHANGED)
  async handleClientStateChangedEvent(
    clientStateChangedEvent: ClientStateChangedEvent,
  ) {
    const clientId = validate(clientStateChangedEvent.clientId, 'string');

    const layers = <LayerDto[]>[
      {
        id: 'menu-layer',
        collectionName: 'menus',
        set: this.getMenus(),
      },
      {
        id: 'pages-layer',
        collectionName: 'pages',
        set: this.getPages(),
      },
    ];

    this.eventEmitter.emit(ADD_LAYERS, {
      channelId: clientId,
      layers,
    });
  }

  getMenus() {
    return [];
  }

  getPages() {
    const now = moment().unix();

    return [
      {
        id: 'portfolio',
        created: now,
        updated: now,
        elements: homeElement,
      },
    ];
  }
}
