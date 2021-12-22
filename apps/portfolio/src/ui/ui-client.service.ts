import {
  ClientStateChangedEvent,
  CLIENT_STATE_CHANGED,
  EventsService,
  LayerDto,
} from '@app/sdk';
import { Injectable } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { validate } from 'bycontract';
import moment from 'moment';
import { homeElement } from './elements/home/home.element';

@Injectable()
export class UiClientService {
  constructor(private eventsService: EventsService) {}

  @EventPattern(CLIENT_STATE_CHANGED)
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

    this.eventsService.emitLayers(clientId, layers);
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
