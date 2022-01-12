import {
  AbstractProcessor,
  BaseContext,
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
import { ethers } from 'ethers';
import _ from 'lodash';
import moment from 'moment';
import * as Rx from 'rxjs';
import {
  TOKEN_PNL_EVENTS,
  TOKEN_PNL_MILESTONES,
  TOKEN_PNL_SUMMARIES,
} from '../util/collectionNames';
import { defaultLogo } from '../util/constants';
import { tokenContractId } from '../util/ids';
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
        this.removeMilestones(),
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
          id: TOKEN_PNL_MILESTONES,
          collectionName: TOKEN_PNL_MILESTONES,
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

          const document: TokenPnlEventDocument = {
            id: transaction.hash,
            amountToken: value,
            amountFiat: valueFiat,
            blockNumber: Number(transaction.block_number),
            blockTimestamp: moment(transaction.block_timestamp).unix(),
            chainId: chain.id,
            chainLogo: chain.logo,
            chainName: chain.name,
            costBasisFiat: costBasis?.fiat ?? 0,
            description,
            fiatSymbol: context.selectedCurrency.symbol,
            gasNativeToken: gas,
            gasFiat: gasFiat,
            icon,
            links: {
              explorer: `${chain.explorer}tx/${transaction.hash}`,
            },
            nativeTokenPrice: nativePrice.price,
            nativeTokenSymbol: chain.token.symbol,
            realizedGainFiat: realizedGain,
            realizedGainPc,
            realizedValueFiat: realizedValue,
            tokenAddress: token.address,
            tokenLogo: token.logo,
            tokenName: token.name,
            tokenPrice: tokenPrice?.price,
            tokenSymbol: token.symbol,
            unrealizedCostFiat: unrealizedCost,
          };

          return document;
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
          (it) => tokenContractId(it.chainId, it.tokenAddress), // TODO: make this chain / token concat DRY, I use it in multiple places
        )
        .values()
        .map((events) => {
          const tokenAddress = events[0].tokenAddress;
          const chainId = events[0].chainId;
          const tokenId = tokenContractId(chainId, tokenAddress);
          const costBasis = _.chain(events)
            .reduce((prev, curr) => prev + curr.costBasisFiat, 0)
            .value();

          const realizedGain = _.sumBy(events, 'realizedGain');
          const realizedGainPc =
            _.sumBy(events, 'realizedGainPc') / events.length;
          const realizedValue = _.sumBy(events, 'realizedValue');

          const document: TokenPnlSummaryDocument = {
            id: tokenId,
            chainId: events[0].chainId,
            chainLogo: events[0].chainLogo,
            chainName: events[0].chainName,
            costBasisFiat: costBasis,
            fiatSymbol: context.selectedCurrency.symbol,
            links: {
              details: `portfolio/tokens/pnl/${chainId}/${tokenAddress}`,
            },
            realizedGainFiat: realizedGain,
            realizedGainPc,
            realizedValueFiat: realizedValue,
            tokenLogo: events[0].tokenLogo,
            tokenName: events[0].tokenName,
            tokenSymbol: events[0].tokenSymbol,
            unrealizedCostFiat: 0, // TODO: implement this
          };

          return document;
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
          collectionName: TOKEN_PNL_EVENTS,
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
          collectionName: TOKEN_PNL_SUMMARIES,
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

  private removeMilestones() {
    return Rx.tap((context: Context) => {
      const removeMilestonesQuery = {
        id: TOKEN_PNL_MILESTONES,
      };

      this.eventService.removeLayers(context.clientId, removeMilestonesQuery);
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
