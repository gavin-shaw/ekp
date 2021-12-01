import { ClientStateEvent, ServerStateDto } from '@app/sdk';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { validate } from 'bycontract';
import { FarmBalanceService } from '../balance';
import { Farm, FarmPersistService } from '../persist';
import { FarmsListSchema, FarmUiService } from '../ui';
import { FarmDto } from './farm.dto';
import { FarmsDtoSchema } from './farms-dto.schema';

@Injectable()
export class FarmGateway {
  constructor(
    private eventEmitter: EventEmitter2,
    private logger: Logger,
    private farmPersistService: FarmPersistService,
    private uiService: FarmUiService,
    private farmBalanceService: FarmBalanceService,
  ) {}

  @OnEvent('client-state')
  async handleClientState(event: ClientStateEvent) {
    const { clientId, state } = event;

    validate([clientId, state], ['string', 'object']);

    this.logger.log(`Handling client state event`, {
      clientId,
    });

    const farms = await this.farmPersistService.getEnabledFarms(
      state.entityHeads?.farms,
    );

    this.formatFarmsAndEmit(farms, event);

    (async () => {
      this.logger.log(`Fetching new balances for ${farms.length} farms`);

      const farmsWithUpdatedBalance =
        await this.farmBalanceService.getFarmsWithBalance(farms);

      this.formatFarmsAndEmit(farmsWithUpdatedBalance, event);

      await this.farmPersistService.save(farmsWithUpdatedBalance);
    })();

    // TODO: handle user farm positions
    // if (!!state.walletAddress) {
    //   await this.walletService.applyWalletToFarms(farms, state);
    // }
  }

  private async formatFarmsAndEmit(
    farms: Farm[],
    clientEvent: ClientStateEvent,
  ): Promise<void> {
    const farmDtos = await this.uiService.getServerState(
      farms,
      clientEvent.state,
    );

    this.emitServerState(farmDtos, clientEvent.clientId);
  }

  emitServerState(farmDtos: FarmDto[], clientId: string) {
    const serverState: ServerStateDto = {
      entities: {
        farms: farmDtos,
      },
      entitiesSchema: {
        type: 'object',
        properties: {
          farms: FarmsDtoSchema,
        },
      },
      uiSchema: FarmsListSchema,
      meta: { pluginName: 'Farms' },
    };

    this.eventEmitter.emit('server-state', { clientId, state: serverState });
  }
}
