import {
  ChainId,
  chains,
  ClientStateChangedEvent,
  CoingeckoService,
  CoinPrice,
  CurrencyDto,
  EventService,
  formatters,
  LayerDto,
  logger,
  MilestoneDocumentDto,
  moralis,
  MoralisService,
  TokenMetadata,
} from '@app/sdk';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { validate } from 'bycontract';
import { randomUUID } from 'crypto';
import { ethers } from 'ethers';
import _ from 'lodash';
import moment from 'moment';
import * as Rx from 'rxjs';
import { TOKEN_PNL_QUEUE } from '../queues';
import { defaultLogo } from '../util/constants';
import { TokenPnlEvent, TokenPnlSummary } from './dtos';
import { TokenPnlStatsDocument } from './dtos/token-pnl-stats.document';

@Processor(TOKEN_PNL_QUEUE)
export class TokenPnlProcessor {
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

      logger.log(`Processing TOKEN_PNL_QUEUE for ${clientId}`);

      this.emitMilestones(clientId, [
        {
          id: '1-transactions',
          status: 'progressing',
          label: 'Fetching your transactions',
        },
        {
          id: '2-tokenMetadata',
          status: 'pending',
          label: 'Fetching token metadata',
        },
        {
          id: '3-prices',
          status: 'pending',
          label: 'Fetching historic token prices',
        },
      ]);

      // TODO: use rxjs in a more idiomatic way
      await Rx.lastValueFrom(
        Rx.combineLatest([
          this.getAllTransfersOf(watchedWallets),
          this.getAllTransactionsOf(watchedWallets),
        ]).pipe(
          Rx.tap(([transfers]) =>
            this.emitMilestones(clientId, [
              {
                id: '1-transactions',
                status: 'complete',
                label: `Fetched ${transfers.length} transactions`,
              },
            ]),
          ),

          Rx.mergeMap(async ([transfers, transactions]) => ({
            transfers,
            transactions,
            tokens: await this.getTokenMetadata(transfers),
          })),

          Rx.tap(({ tokens }) =>
            this.emitMilestones(clientId, [
              {
                id: '2-tokenMetadata',
                status: 'complete',
                label: `Fetched metadata for ${tokens.length} `,
              },
            ]),
          ),

          Rx.mergeMap(async ({ transfers, transactions, tokens }) => ({
            transfers,
            transactions,
            tokens,
            coinPrices: await this.getCoinPricesOf(tokens, selectedCurrency),
          })),

          Rx.tap(() =>
            this.emitMilestones(clientId, [
              {
                id: '3-prices',
                status: 'complete',
                label: `Fetched historic pricing`,
              },
            ]),
          ),

          Rx.map(({ transfers, transactions, tokens, coinPrices }) =>
            this.mapPnlEvents(
              transfers,
              transactions,
              tokens,
              selectedCurrency,
              watchedWallets,
              coinPrices,
            ),
          ),

          Rx.tap((pnlEvents) => this.emitPnlEvents(pnlEvents, clientId)),

          Rx.map((pnlEvents) =>
            this.mapPnlSummaries(pnlEvents, selectedCurrency),
          ),

          Rx.tap((pnlSummaries) =>
            this.emitPnlSummaries(pnlSummaries, clientId),
          ),

          Rx.map((pnlEvents) => this.mapPnlStats(selectedCurrency, pnlEvents)),

          Rx.tap((pnlStats) => this.emitPnlStats(clientId, pnlStats)),

          Rx.tap(() => this.removeMilestones(clientId)),
        ),
      );
    } catch (error) {
      logger.error(error);
    }
  }
  emitPnlStats(clientId: string, document: TokenPnlStatsDocument): void {
    const layers = <LayerDto[]>[
      {
        id: `token-pnl-stats-layer`,
        collectionName: 'stats',
        set: [document],
      },
    ];

    this.eventService.addLayers(clientId, layers);
  }

  private mapPnlStats(
    selectedCurrency: CurrencyDto,
    pnlEvents: TokenPnlEvent[],
  ): TokenPnlStatsDocument {
    return {
      id: 'token_pnl',
      costBasis: _.sumBy(pnlEvents, (it) => it.costBasis.fiat || 0),
      realizedValue: _.sumBy(pnlEvents, (it) => it.realizedValue || 0),
      realizedGain: _.sumBy(pnlEvents, (it) => it.realizedGain || 0),
      fiatSymbol: selectedCurrency.symbol,
    };
  }

  private mapPnlEvents(
    transfers: moralis.TokenTransfer[],
    transactions: moralis.Transaction[],
    tokens: TokenMetadata[],
    selectedCurrency: CurrencyDto,
    watchedWallets: { address: string }[],
    coinPrices: CoinPrice[],
  ): TokenPnlEvent[] {
    validate(
      [
        transfers,
        transactions,
        tokens,
        selectedCurrency,
        watchedWallets,
        coinPrices,
      ],
      [
        'Array.<object>',
        'Array.<object>',
        'Array.<object>',
        'object',
        'Array.<object>',
        'Array.<object>',
      ],
    );

    const watchedAddresses = watchedWallets.map((it) =>
      it.address.toLowerCase(),
    );

    const tokenCostBases: Record<string, { fiat: number; token: number }>[] =
      [];

    const transfersMap = _.chain(transfers)
      .groupBy((it) => it.transaction_hash)
      .mapValues((it) => it[0])
      .value();

    const tokensMap = _.chain(tokens)
      .groupBy((it) => `${it.chainId}_${it.address.toLowerCase()}`)
      .mapValues((it) => it[0])
      .value();

    const coinPriceMap = _.chain(coinPrices)
      .groupBy((it) => `${it.coinId}_${it.timestamp}`)
      .mapValues((it) => it[0])
      .value();

    return _.chain(transactions)
      .sortBy((it) => it.block_timestamp)
      .map((transaction) => {
        // TODO: ignore deposits and withdrawals for now, as they will always be to your same wallet
        if (
          transaction.input.startsWith('0xd0e30db0') ||
          transaction.input.startsWith('0x2e1a7d4d')
        ) {
          return undefined;
        }

        const transfer = transfersMap[transaction.hash];

        let fromAddress = transaction.from_address;
        let toAddress = transaction.to_address;

        if (!!transfer) {
          fromAddress = transfer.from_address.toLowerCase();
          toAddress = transfer.to_address.toLowerCase();
        }

        if (
          watchedAddresses.includes(toAddress) &&
          watchedAddresses.includes(fromAddress)
        ) {
          return undefined;
        }

        const chain = chains[transaction.chain_id];

        let token = chain.token;

        if (!!transfer) {
          token =
            tokensMap[
              `${transaction.chain_id}_${transfer.address.toLowerCase()}`
            ];
        }

        if (!token?.coinId) {
          return undefined;
        }

        const transactionStartOfDay = moment(transaction.block_timestamp)
          .utc()
          .startOf('day')
          .unix();

        const tokenPrice =
          coinPriceMap[`${token.coinId}_${transactionStartOfDay}`];

        if (!tokenPrice) {
          logger.warn(
            `Skipping token transfer, could not find tokenPrice: ${token.coinId}`,
          );
          return undefined;
        }

        const nativePrice =
          coinPriceMap[`${chain.token.coinId}_${transactionStartOfDay}`];

        if (!nativePrice) {
          console.log('missing native price');
          return undefined;
        }

        const gas = Number(
          ethers.utils.formatEther(
            ethers.BigNumber.from(transaction.gas_price).mul(
              Number(transaction.receipt_gas_used),
            ),
          ),
        );

        const gasFiat = nativePrice.price * gas;

        let value = !!transaction.value
          ? Number(ethers.utils.formatEther(transaction.value))
          : undefined;

        if (!!transfer) {
          value = !!transfer.value
            ? Number(ethers.utils.formatUnits(transfer.value, token.decimals))
            : undefined;
        }

        if (!value) {
          return undefined;
        }

        const valueFiat = tokenPrice.price * value;

        let description = 'Unknown';

        if (watchedAddresses.includes(fromAddress)) {
          description = `Withdraw ${formatters.tokenValue(value)} ${
            token?.symbol
          }`;
        } else if (watchedAddresses.includes(toAddress)) {
          description = `Deposit ${formatters.tokenValue(value)} ${
            token?.symbol
          }`;
        }

        let costBasis: { token: number; fiat: number };
        let realizedGain: number;
        let realizedGainPc: number;
        let realizedValue: number;
        let unrealizedCost: number;

        const tokenId = `${token.chainId}_${token.address}`;

        const previousCostBasis = tokenCostBases[tokenId] ?? {
          token: 0,
          fiat: 0,
        };

        if (watchedAddresses.includes(toAddress)) {
          costBasis = {
            token: value,
            fiat: valueFiat,
          };

          previousCostBasis.token += costBasis.token;
          previousCostBasis.fiat += costBasis.fiat;
          unrealizedCost = previousCostBasis.fiat;
          tokenCostBases[tokenId] = previousCostBasis;
        }

        if (watchedAddresses.includes(fromAddress)) {
          costBasis = {
            token: -1 * value,
            fiat:
              -1 * (value / previousCostBasis.token) * previousCostBasis.fiat,
          };

          previousCostBasis.token += value;
          previousCostBasis.fiat += costBasis.fiat;
          realizedValue = valueFiat;
          realizedGain = valueFiat + costBasis.fiat;
          realizedGainPc = (valueFiat + costBasis.fiat) / costBasis.fiat;
          unrealizedCost = previousCostBasis.fiat;

          tokenCostBases[tokenId] = previousCostBasis;
        }

        return <TokenPnlEvent>{
          id: transaction.hash,
          blockNumber: Number(transaction.block_number),
          chain: {
            id: chain.id,
            logo: chain.logo,
            name: chain.name,
          },
          costBasis,
          description,
          fiatSymbol: selectedCurrency.symbol,
          gas,
          gasFiat,
          links: {
            transaction: `${chain.explorer}tx/${transaction.hash}`,
          },
          nativePrice: nativePrice?.price,
          realizedGain,
          realizedGainPc,
          realizedValue,
          timestamp: moment(transaction.block_timestamp).unix(),
          token: {
            address: token.address,
            coinId: token.coinId,
            decimals: Number(token.decimals),
            logo: token.logo,
            name: token.name,
            symbol: token.symbol,
          },
          tokenPrice: tokenPrice?.price,
          unrealizedCost,
          value,
          valueFiat,
        };
      })
      .filter((it) => !!it)
      .value();
  }

  private mapPnlSummaries(
    pnlEvents: TokenPnlEvent[],
    selectedCurrency: CurrencyDto,
  ): TokenPnlSummary[] {
    validate([pnlEvents], 'Array.<object>');

    return _.chain(pnlEvents)
      .groupBy(
        (it) => `${it.chain.id}_${it.token.address}`, // TODO: make this chain / token concat DRY, I use it in multiple places
      )
      .values()
      .map((events) => {
        const token = events[0].token;
        const chain = events[0].chain;
        const costBasis = _.chain(events)
          .reduce(
            (prev, curr) => ({
              token: prev.token + curr.costBasis.token,
              fiat: prev.fiat + curr.costBasis.fiat,
            }),
            { token: 0, fiat: 0 },
          )
          .value();

        const realizedGain = _.sumBy(events, 'realizedGain');
        const realizedGainPc =
          _.sumBy(events, 'realizedGainPc') / events.length;
        const realizedValue = _.sumBy(events, 'realizedValue');

        return <TokenPnlSummary>{
          id: `${chain.id}_${token.address}`,
          chain,
          costBasis,
          fiatSymbol: selectedCurrency.symbol,
          links: {
            pnlDetails: `tokens/realizedpnl/${chain.id}/${token.address}`,
          },
          realizedGain,
          realizedGainPc,
          realizedValue,
          token,
        };
      })
      .value();
  }

  private async getCoinPricesOf(
    tokens: TokenMetadata[],
    selectedCurrency: CurrencyDto,
  ): Promise<CoinPrice[]> {
    const chainCoinIds = _.chain(chains)
      .values()
      .map((it) => it.token.coinId)
      .value();

    const tokenCoinIds = tokens
      .map((token) =>
        this.coingeckoService.coinIdOf(token.chainId as ChainId, token.address),
      )
      .filter((it) => !!it);

    const coinPrices = await _.chain(tokenCoinIds)
      .union(chainCoinIds)
      .map((coinId) =>
        this.coingeckoService.dailyPricesOf(coinId, selectedCurrency.id),
      )
      .thru((it) => Promise.all<CoinPrice[]>(it))
      .value();

    return _.flatten(coinPrices);
  }

  private removeMilestones(clientId: string) {
    this.eventService.removeLayers(clientId, {
      collectionName: 'token_pnl_milestones',
      tags: ['token-pnl-milestones'],
    });
  }

  private emitMilestones(
    clientId: string,
    milestones: MilestoneDocumentDto[],
  ): void {
    const layers = [
      {
        id: randomUUID(),
        collectionName: 'token_pnl_milestones',
        tags: ['token-pnl-milestones'],
        set: milestones,
      },
    ];

    this.eventService.addLayers(clientId, layers);
  }

  private emitPnlEvents(documents: TokenPnlEvent[], clientId: string) {
    logger.log(
      `Emitting ${documents.length} PnL events to client: ` + clientId,
    );
    const layers = [
      {
        id: 'token-pnl-events-layer',
        collectionName: 'token_pnl_events',
        set: documents,
      },
    ];

    this.eventService.addLayers(clientId, layers);
  }

  private emitPnlSummaries(documents: TokenPnlSummary[], clientId: string) {
    const layers = [
      {
        id: 'token-pnl-summaries-layer',
        collectionName: 'token_pnl_summaries',
        set: documents,
      },
    ];

    this.eventService.addLayers(clientId, layers);
  }

  private getTokenMetadata(
    transfers: moralis.TokenTransfer[],
  ): Promise<TokenMetadata[]> {
    return Promise.all(
      _.chain(transfers)
        .uniqBy((it) => `${it.chain_id}_${it.address}`)
        .map((it) =>
          this.moralisService
            .tokenMetadataOf(it.chain_id, it.address)
            .then(async (it) => {
              const coinId = this.coingeckoService.coinIdOf(
                it.chainId as ChainId,
                it.address,
              );

              const logo = coinId
                ? await this.coingeckoService.getImageUrl(coinId)
                : defaultLogo;

              return {
                ...it,
                coinId,
                logo,
              };
            }),
        )
        .value(),
    );
  }

  private async getAllTransfersOf(
    watchedWallets: { address: string }[],
  ): Promise<moralis.TokenTransfer[]> {
    validate(watchedWallets, 'Array.<object>');

    const promises = [];

    for (const chain of Object.keys(chains)) {
      for (const wallet of watchedWallets.map((it) => it.address)) {
        promises.push(
          this.moralisService.allTokenTransfersOf(chain as ChainId, wallet),
        );
      }
    }

    return _.flatten(await Promise.all(promises));
  }

  private async getAllTransactionsOf(
    watchedWallets: { address: string }[],
  ): Promise<moralis.Transaction[]> {
    validate(watchedWallets, 'Array.<object>');

    const promises = [];

    for (const chain of Object.keys(chains)) {
      for (const wallet of watchedWallets.map((it) => it.address)) {
        promises.push(
          this.moralisService.allTransactionsOf(chain as ChainId, wallet),
        );
      }
    }

    return _.flatten(await Promise.all(promises));
  }
}
