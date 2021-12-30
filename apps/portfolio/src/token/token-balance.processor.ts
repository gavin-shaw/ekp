import {
  ChainId,
  chains,
  ClientStateChangedEvent,
  CoingeckoService,
  CoinPrice,
  CurrencyDto,
  EventService,
  LayerDto,
  logger,
  moralis,
  MoralisService,
  TokenMetadata,
} from '@app/sdk';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { validate } from 'bycontract';
import { ethers } from 'ethers';
import _ from 'lodash';
import moment from 'moment';
import * as Rx from 'rxjs';
import { TOKEN_BALANCE_QUEUE } from '../queues';
import { TokenBalanceDocument } from './dtos';
import { TokenStatsDocument } from './dtos/token-stats.document';

@Processor(TOKEN_BALANCE_QUEUE)
export class TokenBalanceProcessor {
  constructor(
    private coingeckoService: CoingeckoService,
    private eventService: EventService,
    private moralisService: MoralisService,
  ) {}

  private validateEvent(event: ClientStateChangedEvent) {
    const clientId = validate(event.clientId, 'string');

    const selectedCurrency = validate(
      event.state?.client.selectedCurrency,
      'object',
    );

    const watchedWallets = validate(
      event.state?.client.watchedWallets,
      'Array.<object>',
    );

    return {
      clientId,
      selectedCurrency,
      watchedWallets,
    };
  }

  @Process()
  async handleClientStateChangedEvent(job: Job<ClientStateChangedEvent>) {
    try {
      const { clientId, selectedCurrency, watchedWallets } = this.validateEvent(
        job.data,
      );

      logger.log(`Processing TOKEN_BALANCE_QUEUE for ${clientId}`);

      await Rx.lastValueFrom(
        Rx.combineLatest([this.getAllBalancesOf(watchedWallets)]).pipe(
          Rx.mergeMap(async ([tokenBalances]) => ({
            tokenBalances,
            coinPrices: await this.getCoinPricesOf(
              tokenBalances,
              selectedCurrency,
            ),
            tokenMetadata: await this.getTokenMetadata(tokenBalances),
          })),

          Rx.map(({ tokenBalances, coinPrices, tokenMetadata }) =>
            this.mapTokenBalanceDocuments(
              tokenBalances,
              tokenMetadata,
              coinPrices,
              selectedCurrency,
            ),
          ),

          Rx.tap((documents) => this.emitTokenBalances(clientId, documents)),

          Rx.map((documents) =>
            this.mapTokenStats(documents, selectedCurrency),
          ),

          Rx.tap((document) => this.emitTokenStats(clientId, document)),
        ),
      );
    } catch (error) {
      logger.error(error);
    }
  }

  private async getAllBalancesOf(
    watchedWallets: { address: string }[],
  ): Promise<moralis.TokenBalance[]> {
    validate(watchedWallets, 'Array.<object>');

    const promises = [];

    for (const chain of _.keys(chains)) {
      for (const wallet of watchedWallets.map((it) => it.address)) {
        promises.push(this.moralisService.tokensOf(chain as ChainId, wallet));
      }
    }

    return _.flatten(await Promise.all<moralis.TokenBalance[]>(promises));
  }

  private async getCoinPricesOf(
    tokenBalances: moralis.TokenBalance[],
    selectedCurrency: CurrencyDto,
  ): Promise<CoinPrice[]> {
    return await _.chain(tokenBalances)
      .map((tokenBalance) =>
        this.coingeckoService.coinIdOf(
          tokenBalance.chain_id,
          tokenBalance.token_address,
        ),
      )
      .filter((it) => !!it)
      .thru((coinIds) =>
        this.coingeckoService.latestPricesOf(coinIds, selectedCurrency.id),
      )
      .value();
  }

  private async getTokenMetadata(
    tokenBalances: moralis.TokenBalance[],
  ): Promise<TokenMetadata[]> {
    return _.chain(tokenBalances)
      .map(async (tokenBalance) => {
        const coinId = this.coingeckoService.coinIdOf(
          tokenBalance.chain_id,
          tokenBalance.token_address,
        );

        const logo = !!coinId
          ? await this.coingeckoService.getImageUrl(coinId)
          : undefined;

        return <TokenMetadata>{
          chainId: tokenBalance.chain_id,
          address: tokenBalance.token_address,
          coinId,
          decimals: Number(tokenBalance.decimals),
          logo,
          name: tokenBalance.name,
          symbol: tokenBalance.symbol,
        };
      })
      .thru((promises) => Promise.all(promises))
      .value();
  }

  private emitTokenStats(clientId: any, document: TokenStatsDocument) {
    const layers = <LayerDto[]>[
      {
        id: `token-stats-layer`,
        collectionName: 'stats',
        set: [document],
      },
    ];

    this.eventService.addLayers(clientId, layers);
  }

  private mapTokenStats(
    documents: TokenBalanceDocument[],
    selectedCurrency: CurrencyDto,
  ): TokenStatsDocument {
    return {
      id: 'token_balance',
      fiatSymbol: selectedCurrency.symbol,
      totalValue: _.sumBy(
        documents,
        (document) => document.priceFiat * document.balance,
      ),
    };
  }

  private emitTokenBalances(
    clientId: string,
    tokenBalances: TokenBalanceDocument[],
  ) {
    const layers = <LayerDto[]>[
      {
        id: `token-balances-layer`,
        collectionName: 'token_balances',
        set: tokenBalances,
      },
    ];

    this.eventService.addLayers(clientId, layers);
  }

  private mapTokenBalanceDocuments(
    tokenBalances: moralis.TokenBalance[],
    tokenMetadatas: TokenMetadata[],
    coinPrices: CoinPrice[],
    selectedCurrency: CurrencyDto,
  ): TokenBalanceDocument[] {
    validate(
      [tokenBalances, coinPrices, tokenMetadatas, selectedCurrency],
      ['Array.<object>', 'Array.<object>', 'Array.<object>', 'object'],
    );

    const tokensById = _.groupBy(
      tokenBalances,
      (tokenBalance) =>
        `${tokenBalance.chain_id}_${tokenBalance.token_address}`,
    );

    const now = moment().unix();

    return Object.entries(tokensById)
      .map(([id, tokens]) => {
        const balance = _.sumBy(tokens, (token) =>
          Number(ethers.utils.formatUnits(token.balance, token.decimals)),
        );

        const chainMetadata = chains[tokens[0].chain_id];

        const tokenMetadata = tokenMetadatas.find(
          (it) => `${it.chainId}_${it.address}` === id,
        );

        if (!tokenMetadata?.coinId) {
          return undefined;
        }

        const coinPrice = coinPrices.find(
          (it) => it.coinId.toLowerCase() === tokenMetadata.coinId,
        );

        return {
          id,
          created: now,
          updated: now,
          allowSwap: !!coinPrice,
          allowBurnToken: !!coinPrice,
          balance,
          chain: {
            id: chainMetadata.id,
            logo: chainMetadata.logo,
            name: chainMetadata.name,
          },
          coinId: tokenMetadata.coinId,
          contractAddress: tokens[0].token_address,
          decimals: Number(tokens[0].decimals),
          fiatSymbol: selectedCurrency.symbol,
          links: {
            swap: `${chainMetadata.swap}?inputCurrency=${tokens[0].token_address}`,
            token: `${chainMetadata.explorer}token/${tokens[0].token_address}`,
          },
          logo: tokenMetadata.logo,
          name: tokens[0].name,
          priceFiat: coinPrice?.price,
          symbol: tokens[0].symbol,
          valueFiat: {
            _eval: true,
            scope: {
              price: '$.priceFiat',
              balance: '$.balance',
            },
            expression: 'balance * price',
          },
        };
      })
      .filter((it) => !!it);
  }
}
