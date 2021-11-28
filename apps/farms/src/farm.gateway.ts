import { ClientStateEvent, ServerStateDto } from '@app/sdk';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { FarmDto, FarmsDtoSchema } from './dto/farm.dto';
import { FarmService } from './service/farm.service';
import { UiService } from './service/ui.service';
import { FarmsListSchema } from './ui/farms-list.schema';

@Injectable()
export class FarmGateway {
  constructor(
    private farmService: FarmService,
    private logger: Logger,
    private uiService: UiService,
    private eventEmitter: EventEmitter2,
  ) {}

  @OnEvent('client-state')
  async handleClientState(event: ClientStateEvent) {
    const { clientId, state } = event;

    this.logger.log(`Handling client state event`, {
      clientId,
    });

    const farms = await this.farmService.getCurrentFarms(
      state.entityHeads?.farms,
    );

    // if (!!state.walletAddress) {
    //   await this.walletService.applyWalletToFarms(farms, state);
    // }

    const farmDtos = await this.uiService.formatFarms(farms, state);

    this.emitServerState(farmDtos);
  }

  emitServerState(farmDtos: FarmDto[]) {
    const serverState: ServerStateDto = {
      entities: {
        farms: farmDtos,
      },
      entitySchema: {
        type: 'object',
        properties: {
          farms: FarmsDtoSchema,
        },
      },
      uiSchema: FarmsListSchema,
      meta: { pluginName: 'Farms' },
    };

    this.eventEmitter.emit('server-state', serverState);
  }
}
