import {
  ADD_LAYERS,
  ClientConnectedEvent,
  ClientStateChangedEvent,
  CLIENT_CONNECTED,
  CLIENT_STATE_CHANGED,
  CurrencyDto,
  formatters,
} from '@app/sdk';
import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { validate } from 'bycontract';
import moment from 'moment';
import { metadata } from '../metadata';
import { TokenService } from '../token';
import { UiService } from '../ui';

@Injectable()
export class StorageService {
  constructor(
    private eventEmitter: EventEmitter2,
    private tokenService: TokenService,
    private uiService: UiService,
  ) {}

  // TODO: make this dry (see method above)
  @OnEvent(CLIENT_STATE_CHANGED)
  async handleClientStateChangedEvent(
    clientStateChangedEvent: ClientStateChangedEvent,
  ) {
    // TODO: put this validation in the sdk
    const clientId = validate(clientStateChangedEvent.clientId, 'string');

    const selectedCurrency = validate(
      clientStateChangedEvent.state?.client.selectedCurrency,
      'object',
    );

    const lastTimestamp = validate(
      clientStateChangedEvent.state?.client.lastTimestamp,
      'number=',
    );

    const watchedWallets = validate(
      clientStateChangedEvent.state?.client.watchedWallets,
      'Array.<object>',
    );

    try {
      await this.emitUi(clientId);
      // TODO: move this to its own service
      await this.emitTokens(clientId, selectedCurrency, watchedWallets);
    } catch (err) {
      console.error(err);
    }
  }

  private async emitUi(clientId: string) {
    const menus = this.uiService.getMenus();
    const pages = this.uiService.getPages();

    const now = moment().unix();

    this.eventEmitter.emit(ADD_LAYERS, {
      clientId,
      pluginId: metadata.pluginId,
      layers: [
        {
          id: 'menu-layer',
          tableName: 'menus',
          timestamp: now,
          set: menus,
        },
        {
          id: 'pages-layer',
          tableName: 'pages',
          timestamp: now,
          set: pages,
        },
      ],
    });
  }

  private async emitTokens(
    clientId: string,
    selectedCurrency: CurrencyDto,
    watchedWallets: { address: string }[],
  ) {
    const tokens = await this.tokenService.getAllTokens(
      selectedCurrency,
      watchedWallets,
    );

    const totalValue = tokens.reduce(
      (prev, curr) => prev + curr.balanceFiat?.value ?? 0,
      0,
    );

    const now = moment().unix();

    this.eventEmitter.emit(ADD_LAYERS, {
      clientId,
      pluginId: metadata.pluginId,
      layers: [
        {
          id: 'tokens-layer',
          tableName: 'tokens',
          timestamp: now,
          set: tokens,
        },
        {
          id: 'portfolio-stats-token-layer',
          tableName: 'portfolioStats',
          timestamp: now,
          set: [
            {
              id: 'token-value',
              value: formatters.currencyValue(
                totalValue,
                selectedCurrency.symbol,
              ),
              name: 'Token Value',
            },
          ],
        },
      ],
    });
  }
}
