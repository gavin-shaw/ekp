import {
  chains,
  CoingeckoService,
  CoinPrice,
  EventService,
  moralis,
  MoralisService,
  TokenMetadata,
} from '@app/sdk';
import { Processor } from '@nestjs/bull';
import { ethers } from 'ethers';
import _ from 'lodash';
import * as Rx from 'rxjs';
import { AbstractProcessor, BaseContext } from '../abstract.processor';
import { TOKEN_BALANCES, TOKEN_BALANCE_MILESTONES } from '../collectionNames';
import { TOKEN_BALANCE_QUEUE } from '../queues';
import { TokenBalanceDocument } from './documents/token-balance.document';

@Processor(TOKEN_BALANCE_QUEUE)
export class TokenBalanceProcessor extends AbstractProcessor<Context> {
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
        this.addTokenBalances(),
        this.emitMilestones(),
        this.addCoinPrices(),
        this.emitMilestones(),
      )
      .pipe(
        this.addTokenMetadatas(),
        this.emitMilestones(),
        this.mapTokenBalanceDocuments(),
        this.emitMilestones(),
        this.emitTokenBalanceDocuments(),
        this.removeMilestones(),
      );
  }

  private addTokenBalances() {
    return Rx.mergeMap(async (context: Context) => {
      const promises = [];

      for (const chainId of context.chainIds) {
        for (const wallet of context.watchedAddresses) {
          promises.push(this.moralisService.tokensOf(chainId, wallet));
        }
      }

      return <Context>{
        ...context,
        tokenBalances: _.flatten(
          await Promise.all<moralis.TokenBalance[]>(promises),
        ),
      };
    });
  }

  private addCoinPrices() {
    return Rx.mergeMap(async (context: Context) => {
      const coinPrices = await _.chain(context.tokenBalances)
        .map((tokenBalance) =>
          this.coingeckoService.coinIdOf(
            tokenBalance.chain_id,
            tokenBalance.token_address,
          ),
        )
        .filter((it) => !!it)
        .thru((coinIds) =>
          this.coingeckoService.latestPricesOf(
            coinIds,
            context.selectedCurrency.id,
          ),
        )
        .value();

      return <Context>{
        ...context,
        coinPrices,
      };
    });
  }

  private addTokenMetadatas() {
    return Rx.mergeMap(async (context: Context) => {
      const tokenMetadatas = await _.chain(context.tokenBalances)
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

      return <Context>{
        ...context,
        tokenMetadatas,
      };
    });
  }

  private mapTokenBalanceDocuments() {
    return Rx.map((context: Context) => {
      const tokensById = _.groupBy(
        context.tokenBalances,
        (tokenBalance) =>
          `${tokenBalance.chain_id}_${tokenBalance.token_address}`,
      );

      const documents = Object.entries(tokensById)
        .map(([id, tokens]) => {
          const balance = _.sumBy(tokens, (token) =>
            Number(ethers.utils.formatUnits(token.balance, token.decimals)),
          );

          const chainMetadata = chains[tokens[0].chain_id];

          const tokenMetadata = context.tokenMetadatas.find(
            (it) => `${it.chainId}_${it.address}` === id,
          );

          if (!tokenMetadata?.coinId) {
            return undefined;
          }

          const coinPrice = context.coinPrices.find(
            (it) => it.coinId.toLowerCase() === tokenMetadata.coinId,
          );

          if (!coinPrice) {
            return undefined;
          }

          return <TokenBalanceDocument>{
            id,
            balanceFiat: coinPrice.price * balance,
            balanceToken: balance,
            chainId: chainMetadata.id,
            chainLogo: chainMetadata.logo,
            chainName: chainMetadata.name,
            coinId: tokenMetadata.coinId,
            fiatSymbol: context.selectedCurrency.symbol,
            links: {
              swap: `${chainMetadata.swap}?inputCurrency=${tokens[0].token_address}`,
              explorer: `${chainMetadata.explorer}token/${tokens[0].token_address}`,
            },
            tokenAddress: tokenMetadata.address,
            tokenLogo: tokenMetadata.logo,
            tokenDecimals: tokenMetadata.decimals,
            tokenSymbol: tokenMetadata.symbol,
            tokenPrice: coinPrice.price,
          };
        })
        .filter((it) => !!it);

      return <Context>{
        ...context,
        documents,
      };
    });
  }

  private emitTokenBalanceDocuments() {
    return Rx.tap((context: Context) => {
      const addLayers = [
        {
          id: `token-balances-layer`,
          collectionName: TOKEN_BALANCES,
          set: context.documents,
        },
      ];
      this.eventService.addLayers(context.clientId, addLayers);
    });
  }

  private removeMilestones() {
    return Rx.tap((context: Context) => {
      const removeMilestonesQuery = {
        id: TOKEN_BALANCE_MILESTONES,
      };

      this.eventService.removeLayers(context.clientId, removeMilestonesQuery);
    });
  }

  private emitMilestones() {
    return Rx.tap((context: Context) => {
      const documents = [
        {
          id: '1-balances',
          status: !context.tokenBalances ? 'progressing' : 'complete',
          label: !context.tokenBalances
            ? 'Fetching your balances'
            : `Fetched ${context.tokenBalances.length} balances`,
        },
        {
          id: '2-prices',
          status: !context.coinPrices ? 'progressing' : 'complete',
          label: !context.coinPrices
            ? 'Fetching token prices'
            : `Fetched pricing for ${context.coinPrices.length} tokens`,
        },
        {
          id: '3-metadata',
          status: !context.tokenMetadatas ? 'pending' : 'complete',
          label: !context.tokenMetadatas
            ? 'Fetching token metadata'
            : `Fetched metadata for ${context.tokenMetadatas.length} tokens`,
        },
        {
          id: '4-final',
          status: !context.documents ? 'pending' : 'complete',
          label: !context.documents ? 'Combining the data' : `Done 👍`,
        },
      ];

      const layers = [
        {
          id: TOKEN_BALANCE_MILESTONES,
          collectionName: TOKEN_BALANCE_MILESTONES,
          set: documents,
        },
      ];

      this.eventService.addLayers(context.clientId, layers);
    });
  }
}

interface Context extends BaseContext {
  readonly coinPrices?: CoinPrice[];
  readonly documents?: TokenBalanceDocument[];
  readonly tokenBalances?: moralis.TokenBalance[];
  readonly tokenMetadatas?: TokenMetadata[];
}
