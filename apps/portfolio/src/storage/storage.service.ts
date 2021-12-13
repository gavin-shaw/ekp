import {
  ClientConnectedEvent,
  CLIENT_CONNECTED,
  UPDATE_STORAGE,
} from '@app/sdk';
import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { validate } from 'bycontract';
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

  @OnEvent(CLIENT_CONNECTED)
  async handleClientConnectedEvent(clientConnectedEvent: ClientConnectedEvent) {
    validate(
      [clientConnectedEvent.clientId, clientConnectedEvent.state],
      ['string', 'object'],
    );

    const menus = this.uiService.getMenus();
    const pages = this.uiService.getPages();

    this.eventEmitter.emit(UPDATE_STORAGE, {
      clientId: clientConnectedEvent.clientId,
      pluginId: metadata.pluginId,
      tables: {
        menus: {
          add: menus,
          clear: true,
        },
        pages: {
          add: pages,
          clear: true,
        },
      },
    });

    const tokens = await this.tokenService.getAllTokens({
      ...clientConnectedEvent.state,
      watchedAddresses: !!clientConnectedEvent.state.client.selectedWallet
        ? [clientConnectedEvent.state.client.selectedWallet]
        : [],
      client: {
        connectedWallets: [],
        currency: {
          id: 'usd',
          symbol: '$',
        },
      },
    });

    this.eventEmitter.emit(UPDATE_STORAGE, {
      clientId: clientConnectedEvent.clientId,
      pluginId: metadata.pluginId,
      tables: {
        tokens: {
          add: tokens,
          clear: true,
        },
      },
    });
  }
}
