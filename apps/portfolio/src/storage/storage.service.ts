import {
  ClientConnectedEvent,
  CLIENT_CONNECTED,
  CLIENT_STATE_CHANGED,
  UPDATE_STORAGE,
} from '@app/sdk';
import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { validate } from 'bycontract';
import { metadata } from '../metadata';
import { NftService } from '../nft';
import { TokenService } from '../token';
import { UiService } from '../ui';
import { formatters } from '@app/sdk';

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

  // TODO: make this dry (see method above)
  @OnEvent(CLIENT_STATE_CHANGED)
  async handleClientStateChangedEvent(
    clientConnectedEvent: ClientConnectedEvent,
  ) {
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
    // TODO: fix currency not being sent properly from the client
    const currency = {
      id: 'usd',
      symbol: '$',
    };

    const tokens = await this.tokenService.getAllTokens({
      ...clientConnectedEvent.state,
      client: {
        ...clientConnectedEvent.state.client,
        currency,
      },
    });

    const totalValue = tokens.reduce(
      (prev, curr) => prev + curr.balanceFiat?.value ?? 0,
      0,
    );

    this.eventEmitter.emit(UPDATE_STORAGE, {
      clientId: clientConnectedEvent.clientId,
      pluginId: metadata.pluginId,
      tables: {
        tokens: {
          add: tokens,
          clear: true,
        },
        portfolioStats: {
          add: [
            {
              id: 'tokenValue',
              value: formatters.currencyValue(totalValue, currency.symbol),
              name: 'Token Value',
            },
          ],
        },
      },
    });
  }

  private async emitNfts(clientConnectedEvent: ClientConnectedEvent) {
    // TODO: fix currency not being sent properly from the client
    const currency = {
      id: 'usd',
      symbol: '$',
    };

    const collections = await this.nftService.allCollectionsOf({
      ...clientConnectedEvent.state,
      client: {
        ...clientConnectedEvent.state.client,
        currency,
      },
    });

    const totalValue = collections.reduce(
      (prev, curr) => prev + curr.floorPriceFiat?.value ?? 0,
      0,
    );

    this.eventEmitter.emit(UPDATE_STORAGE, {
      clientId: clientConnectedEvent.clientId,
      pluginId: metadata.pluginId,
      tables: {
        collections: {
          add: collections,
          clear: true,
        },
        portfolioStats: {
          add: [
            {
              id: 'nftValue',
              value: formatters.currencyValue(totalValue, currency.symbol),
              name: 'NFT Value',
            },
          ],
        },
      },
    });
  }
}
