import {
  ClientConnectedEvent,
  CLIENT_CONNECTED,
  CLIENT_STATE_CHANGED,
  CurrencyDto,
  formatters,
  SET_LAYERS,
} from '@app/sdk';
import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { validate } from 'bycontract';
import moment from 'moment';
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
    // TODO: put this validation in the sdk

    const clientId = validate(clientConnectedEvent.clientId, 'string');

    const selectedCurrency = validate(
      clientConnectedEvent.state?.client.selectedCurrency,
      'object',
    );

    const lastTimestamp = validate(
      clientConnectedEvent.state?.client.lastTimestamp,
      'number=',
    );

    const watchedWallets = validate(
      clientConnectedEvent.state?.client.watchedWallets,
      'Array.<object>',
    );

    try {
      await this.emitUi(clientId);
      await this.emitTokens(clientId, selectedCurrency, watchedWallets);
      await this.emitNfts(clientId, selectedCurrency, watchedWallets);
    } catch (err) {
      console.error(err);
    }
  }

  // TODO: make this dry (see method above)
  @OnEvent(CLIENT_STATE_CHANGED)
  async handleClientStateChangedEvent(
    clientConnectedEvent: ClientConnectedEvent,
  ) {
    // TODO: put this validation in the sdk

    const clientId = validate(clientConnectedEvent.clientId, 'string');

    const selectedCurrency = validate(
      clientConnectedEvent.state?.client.selectedCurrency,
      'object',
    );

    const lastTimestamp = validate(
      clientConnectedEvent.state?.client.lastTimestamp,
      'number=',
    );

    const watchedWallets = validate(
      clientConnectedEvent.state?.client.watchedWallets,
      'Array.<object>',
    );

    try {
      await this.emitUi(clientId);
      await this.emitTokens(clientId, selectedCurrency, watchedWallets);
      await this.emitNfts(clientId, selectedCurrency, watchedWallets);
    } catch (err) {
      console.error(err);
    }
  }

  private async emitUi(clientId: string) {
    const menus = this.uiService.getMenus();
    const pages = this.uiService.getPages();

    const now = moment().unix();

    this.eventEmitter.emit(SET_LAYERS, {
      clientId,
      pluginId: metadata.pluginId,
      layers: [
        {
          id: 'menu-layer',
          tableName: 'menus',
          timestamp: now,
          set: {
            records: menus,
          },
        },
        {
          id: 'pages-layer',
          tableName: 'pages',
          timestamp: now,
          set: {
            records: pages,
          },
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

    this.eventEmitter.emit(SET_LAYERS, {
      clientId,
      pluginId: metadata.pluginId,
      layers: [
        {
          id: 'tokens-layer',
          tableName: 'tokens',
          timestamp: now,
          set: {
            records: tokens,
          },
        },
        {
          id: 'portfolio-stats-token-layer',
          tableName: 'portfolioStats',
          timestamp: now,
          set: {
            records: [
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
        },
      ],
    });
  }

  private async emitNfts(
    clientId: string,
    selectedCurrency: CurrencyDto,
    watchedWallets: { address: string }[],
  ) {
    const collections = await this.nftService.allCollectionsOf(
      selectedCurrency,
      watchedWallets,
    );

    const totalValue = collections.reduce(
      (prev, curr) => prev + curr.floorPriceFiat?.value ?? 0,
      0,
    );

    const now = moment().unix();

    this.eventEmitter.emit(SET_LAYERS, {
      clientId,
      pluginId: metadata.pluginId,
      layers: [
        {
          id: 'nfts-layer',
          tableName: 'collections',
          timestamp: now,
          set: {
            records: collections,
          },
        },
        {
          id: 'portfolio-stats-nft-layer',
          tableName: 'portfolioStats',
          timestamp: now,
          set: {
            records: [
              {
                id: 'nft-value',
                value: formatters.currencyValue(
                  totalValue,
                  selectedCurrency.symbol,
                ),
                name: 'NFT Value',
              },
            ],
          },
        },
      ],
    });
  }
}
