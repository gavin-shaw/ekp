import {
  ClientStateChangedEvent,
  EventService,
  LayerDto,
  logger,
} from '@app/sdk';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { validate } from 'bycontract';
import { UI_QUEUE } from '../util/queue.names';
import menus from './critterz.menus';
import pages from './critterz.pages';

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
        id: 'critterz-menu-layer',
        collectionName: 'menus',
        set: menus(),
      },
      {
        id: 'critterz-pages-layer',
        collectionName: 'pages',
        set: pages(),
      },
    ];

    this.eventService.addLayers(clientId, layers);
  }
}
