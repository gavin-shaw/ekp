import {
  ChainId,
  chains,
  ClientStateChangedEvent,
  CoingeckoService,
  CoinPrice,
  CurrencyDto,
  EventService,
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
import _ from 'lodash';
import * as Rx from 'rxjs';
import { spawn, Worker } from 'threads';
import { TokenPnlEvent } from './dtos/token-pnl-event.document';
import { TokenPnlSummary } from './dtos/token-pnl-summary.document';

@Processor('token-pnl')
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
    const { clientId, selectedCurrency, watchedWallets } = this.validateEvent(
      job.data,
    );

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
        // Rx.tap(({ tokens }) => console.log(tokens.filter((it) => !!it.coinId))),
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

        Rx.mergeMap(
          async ({ transfers, transactions, tokens, coinPrices }) => ({
            transfers,
            transactions,
            tokens,
            coinPrices,
            worker: await spawn(
              new Worker('./src/token/workers/map-pnl-events'),
            ),
          }),
        ),

        Rx.mergeMap(({ transfers, transactions, tokens, coinPrices, worker }) =>
          worker(
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

        Rx.tap((pnlSummaries) => this.emitPnlSummaries(pnlSummaries, clientId)),

        Rx.tap(() => this.removeMilestones(clientId)),

        Rx.catchError((error) => {
          logger.error(
            `(TpkenPnlClient) Error occurred handling client state. ${error}`,
          );
          console.error(error);
          return Rx.of(error);
        }),
      ),
    );
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
            .then((it) => ({
              ...it,
              coinId: this.coingeckoService.coinIdOf(
                it.chainId as ChainId,
                it.address,
              ),
            })),
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
