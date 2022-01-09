import {
  ChainId,
  chains,
  CoingeckoService,
  CoinPrice,
  EventService,
  formatters,
  logger,
  moralis,
  MoralisService,
  TokenMetadata,
} from '@app/sdk';
import { Processor } from '@nestjs/bull';
import { ethers } from 'ethers';
import _ from 'lodash';
import moment from 'moment';
import * as Rx from 'rxjs';
import { AbstractProcessor, BaseContext } from '../abstract.processor';
import { TOKEN_PNL_QUEUE } from '../queues';
import { defaultLogo } from '../util/constants';
import { TokenPnlEventDocument, TokenPnlSummaryDocument } from './documents';

// @Processor(TOKEN_PNL_QUEUE)
export class TokenPnlProcessor extends AbstractProcessor<Context> {
  constructor(
    private coingeckoService: CoingeckoService,
    private eventService: EventService,
    private moralisService: MoralisService,
  ) {
    super();
  }

  pipe(source: Rx.Observable<Context>): Rx.Observable<Context> {
    return source
      .pipe(
        this.emitMilestones(),
        this.addTransfers(),
        this.addTransactions(),
        this.emitMilestones(),
        this.addTokenMetadatas(),
        this.emitMilestones(),
      )
      .pipe(
        this.addCoinPrices(),
        this.emitMilestones(),
        this.mapPnlEventDocuments(),
        this.emitPnlEventDocuments(),
        this.mapPnlSummaryDocuments(),
        this.emitPnlSummaries(),
      );
  }

  private emitMilestones() {
    return Rx.tap((context: Context) => {
      const milestones = [
        {
          id: '1-transactions',
          status: !context.transactions ? 'progressing' : 'complete',
          label: !context.transactions
            ? 'Fetching your transactions'
            : `Fetched ${context.transactions.length} transactions`,
        },
        {
          id: '2-metadata',
          status: !context.tokenMetadatas ? 'pending' : 'complete',
          label: !context.tokenMetadatas
            ? 'Fetching token metadata'
            : `Fetched metadata for ${context.tokenMetadatas.length} tokens`,
        },
        {
          id: '3-prices',
          status: !context.coinPrices ? 'progressing' : 'complete',
          label: !context.coinPrices
            ? 'Fetching historic token prices'
            : `Fetched pricing for ${context.coinPrices.length} tokens`,
        },
      ];

      const layers = [
        {
          id: 'token_pnl_milestones',
          collectionName: 'token_pnl_milestones',
          set: milestones,
        },
      ];

      this.eventService.addLayers(context.clientId, layers);
    });
  }

  private mapPnlEventDocuments() {
    return Rx.map((context: Context) => {
      const watchedAddresses = context.watchedAddresses;

      const tokenCostBases: Record<string, { fiat: number; token: number }>[] =
        [];

      const transfersMap = _.chain(context.transfers)
        .groupBy((it) => it.transaction_hash)
        .mapValues((it) => it[0])
        .value();

      const tokensMap = _.chain(context.tokenMetadatas)
        .groupBy((it) => `${it.chainId}_${it.address.toLowerCase()}`)
        .mapValues((it) => it[0])
        .value();

      const coinPriceMap = _.chain(context.coinPrices)
        .groupBy((it) => `${it.coinId}_${it.timestamp}`)
        .mapValues((it) => it[0])
        .value();

      const documents = _.chain(context.transactions)
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
          let icon = undefined;

          if (watchedAddresses.includes(fromAddress)) {
            description = `Withdraw ${formatters.tokenValue(value)} ${
              token?.symbol
            }`;
            icon = 'cil-arrow-circle-top';
          } else if (watchedAddresses.includes(toAddress)) {
            description = `Deposit ${formatters.tokenValue(value)} ${
              token?.symbol
            }`;
            icon = 'cil-arrow-circle-bottom';
          }

          let costBasis: { token: number; fiat: number };
          let realizedGain: number = undefined;
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

          return <TokenPnlEventDocument>{
            id: transaction.hash,
            blockNumber: Number(transaction.block_number),
            blockTimestamp: moment(transaction.block_timestamp).unix(),
            chain: {
              id: chain.id,
              logo: chain.logo,
              name: chain.name,
            },
            costBasis: costBasis.fiat,
            description,
            gasValue: {
              tokenAmount: gas,
              fiatAmount: gasFiat,
              fiatSymbol: context.selectedCurrency.symbol,
              tokenPrice: nativePrice.price,
              tokenSymbol: chain.token.symbol,
            },
            icon,
            links: {
              explorer: `${chain.explorer}tx/${transaction.hash}`,
            },
            realizedGain,
            realizedGainPc,
            realizedValue,
            token,
            tokenValue: {
              tokenAmount: value,
              fiatAmount: valueFiat,
              fiatSymbol: context.selectedCurrency.symbol,
              tokenPrice: tokenPrice.price,
              tokenSymbol: token.symbol,
            },
            unrealizedCost,
          };
        })
        .filter((it) => !!it)
        .value();

      return <Context>{
        ...context,
        documents,
      };
    });
  }

  private mapPnlSummaryDocuments() {
    return Rx.map((context: Context) => {
      const summaryDocuments = _.chain(context.documents)
        .groupBy(
          (it) => `${it.chain.id}_${it.token.address}`, // TODO: make this chain / token concat DRY, I use it in multiple places
        )
        .values()
        .map((events) => {
          const token = events[0].token;
          const chain = events[0].chain;
          const costBasis = _.chain(events)
            .reduce((prev, curr) => prev + curr.costBasis, 0)
            .value();

          const realizedGain = _.sumBy(events, 'realizedGain');
          const realizedGainPc =
            _.sumBy(events, 'realizedGainPc') / events.length;
          const realizedValue = _.sumBy(events, 'realizedValue');

          return <TokenPnlSummaryDocument>{
            id: `${chain.id}_${token.address}`,
            chain,
            costBasis,
            fiatSymbol: context.selectedCurrency.symbol,
            links: {
              details: `tokens/realizedpnl/${chain.id}/${token.address}`,
            },
            realizedGain,
            realizedGainPc,
            realizedValue,
            token,
          };
        })
        .value();

      return <Context>{
        ...context,
        summaryDocuments,
      };
    });
  }

  private addCoinPrices() {
    return Rx.mergeMap(async (context: Context) => {
      const chainCoinIds = _.chain(chains)
        .values()
        .map((it) => it.token.coinId)
        .value();

      const tokenCoinIds = context.tokenMetadatas
        .map((tokenMetadata) =>
          this.coingeckoService.coinIdOf(
            tokenMetadata.chainId as ChainId,
            tokenMetadata.address,
          ),
        )
        .filter((it) => !!it);

      const coinPrices = await _.chain(tokenCoinIds)
        .union(chainCoinIds)
        .map((coinId) =>
          this.coingeckoService.dailyPricesOf(
            coinId,
            context.selectedCurrency.id,
          ),
        )
        .thru((it) => Promise.all<CoinPrice[]>(it))
        .value();

      return <Context>{
        ...context,
        coinPrices: _.flatten(coinPrices),
      };
    });
  }

  private emitPnlEventDocuments() {
    return Rx.tap((context: Context) => {
      const layers = [
        {
          id: 'token-pnl-events-layer',
          collectionName: 'token_pnl_events',
          set: context.documents,
        },
      ];

      this.eventService.addLayers(context.clientId, layers);
    });
  }

  private emitPnlSummaries() {
    return Rx.tap((context: Context) => {
      const layers = [
        {
          id: 'token-pnl-summaries-layer',
          collectionName: 'token_pnl_summaries',
          set: context.summaryDocuments,
        },
      ];

      this.eventService.addLayers(context.clientId, layers);
    });
  }

  private addTokenMetadatas() {
    return Rx.mergeMap(async (context: Context) => {
      const tokenMetadatas = await Promise.all(
        _.chain(context.transfers)
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

      return <Context>{
        ...context,
        tokenMetadatas,
      };
    });
  }

  private addTransfers() {
    return Rx.mergeMap(async (context: Context) => {
      const promises = [];

      for (const chain of Object.keys(chains)) {
        for (const wallet of context.watchedAddresses) {
          promises.push(
            this.moralisService.allTokenTransfersOf(chain as ChainId, wallet),
          );
        }
      }

      const transfers = _.flatten(await Promise.all(promises));

      return <Context>{
        ...context,
        transfers,
      };
    });
  }

  private addTransactions() {
    return Rx.mergeMap(async (context: Context) => {
      const promises = [];

      for (const chain of Object.keys(chains)) {
        for (const wallet of context.watchedAddresses) {
          promises.push(
            this.moralisService.allTransactionsOf(chain as ChainId, wallet),
          );
        }
      }

      const transactions = _.flatten(await Promise.all(promises));

      return <Context>{
        ...context,
        transactions,
      };
    });
  }
}

interface Context extends BaseContext {
  readonly coinPrices?: CoinPrice[];
  readonly documents?: TokenPnlEventDocument[];
  readonly summaryDocuments?: TokenPnlSummaryDocument[];
  readonly tokenMetadatas?: TokenMetadata[];
  readonly transactions?: moralis.Transaction[];
  readonly transfers?: moralis.TokenTransfer[];
}
