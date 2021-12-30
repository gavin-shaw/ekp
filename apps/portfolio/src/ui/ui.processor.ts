import {
  ClientStateChangedEvent,
  EventService,
  LayerDto,
  logger,
} from '@app/sdk';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { validate } from 'bycontract';
import moment from 'moment';
import { UI_QUEUE } from '../queues';
import { homeElement } from './elements/home/home.element';

@Processor(UI_QUEUE)
export class UiProcessor {
  constructor(private eventService: EventService) {}

  private validateEvent(event: ClientStateChangedEvent) {
    const clientId = validate(event.clientId, 'string');

    return {
      clientId,
    };
  }

  @Process()
  async handleClientStateChangedEvent(job: Job<ClientStateChangedEvent>) {
    const { clientId } = this.validateEvent(job.data);

    logger.log(`Processing UI_QUEUE for ${clientId}`);

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

    this.eventService.addLayers(clientId, layers);
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
