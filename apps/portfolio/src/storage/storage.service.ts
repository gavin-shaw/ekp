import {
  ClientConnectedEvent,
  CLIENT_CONNECTED,
  UPDATE_STORAGE,
} from '@app/sdk';
import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { validate } from 'bycontract';
import { metadata } from '../metadata';
import { NftService } from '../nft';
import { TokenService } from '../token';
import { UiService } from '../ui';

@Injectable()
export class StorageService {
  constructor(
    private eventEmitter: EventEmitter2,
    private tokenService: TokenService,
    private nftService: NftService,
    private uiService: UiService,
  ) {}

  @OnEvent(CLIENT_CONNECTED)
  async handleClientConnectedEvent(clientConnectedEvent: ClientConnectedEvent) {
    validate(
      [clientConnectedEvent.clientId, clientConnectedEvent.state],
      ['string', 'object'],
    );

    this.emitUi(clientConnectedEvent);
    this.emitTokens(clientConnectedEvent);
    this.emitNfts(clientConnectedEvent);
  }

  private async emitUi(clientConnectedEvent: ClientConnectedEvent) {
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
  }

  private async emitTokens(clientConnectedEvent: ClientConnectedEvent) {
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

  private async emitNfts(clientConnectedEvent: ClientConnectedEvent) {
    const collections = await this.nftService.allCollectionsOf({
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
        collections: {
          add: collections,
          clear: true,
        },
      },
    });
  }
}
