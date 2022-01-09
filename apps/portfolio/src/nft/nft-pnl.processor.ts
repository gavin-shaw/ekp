import {
  ChainId,
  chains,
  CoingeckoService,
  CoinPrice,
  EthersService,
  EthersTransaction,
  EventService,
  moralis,
  MoralisService,
  NftCollectionMetadata,
  OpenseaService,
  TokenMetadata,
  TokenValue,
} from '@app/sdk';
import { Processor } from '@nestjs/bull';
import { ethers } from 'ethers';
import _ from 'lodash';
import moment from 'moment';
import * as Rx from 'rxjs';
import { AbstractProcessor, BaseContext } from '../abstract.processor';
import { NFT_PNL_EVENTS, NFT_PNL_SUMMARIES } from '../collectionNames';
import { NFT_PNL_QUEUE } from '../queues';
import { defaultLogo } from '../util/constants';
import { nftContractId, tokenContractId } from '../util/ids';
import { NftPnlEventDocument } from './documents/nft-pnl-event.document';
import { NftPnlSummaryDocument } from './documents/nft-pnl-summary.document';

@Processor(NFT_PNL_QUEUE)
export class NftPnlProcessor extends AbstractProcessor<Context> {
  constructor(
    private coingeckoService: CoingeckoService,
    private ethersService: EthersService,
    private eventService: EventService,
    private moralisService: MoralisService,
    private openseaService: OpenseaService,
  ) {
    super();
  }

  pipe(source: Rx.Observable<Context>): Rx.Observable<Context> {
    return source
      .pipe(
        this.addNftTransfers(),
        this.addTokenTransfers(),
        this.addTransactions(),
        this.addTokenMetadatas(),
        this.addNftMetadata(),
        this.addCoinPrices(),
      )
      .pipe(
        this.mapPnlEventDocuments(),
        this.emitPnlEventDocuments(),
        this.mapPnlSummaryDocuments(),
        this.emitPnlSummaryDocuments(),
      );
  }

  addTokenMetadatas() {
    return Rx.mergeMap(async (context: Context) => {
      const tokenMetadatas: TokenMetadata[] = await Promise.all(
        _.chain(context.tokenTransfers)
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

  private addTokenTransfers() {
    return Rx.mergeMap(async (context: Context) => {
      const promises = [];

      for (const chain of Object.keys(chains)) {
        for (const wallet of context.watchedAddresses) {
          promises.push(
            this.moralisService.allTokenTransfersOf(chain as ChainId, wallet),
          );
        }
      }

      const tokenTransfers = _.chain(await Promise.all(promises))
        .flatten()
        .intersectionWith(
          context.nftTransfers,
          (a: moralis.TokenTransfer, b: moralis.NftTransfer) =>
            a.transaction_hash === b.transaction_hash,
        )
        .value();

      return <Context>{
        ...context,
        tokenTransfers,
      };
    });
  }

  private addCoinPrices() {
    return Rx.mergeMap(async (context: Context) => {
      const chainCoinIds = _.chain(chains)
        .values()
        .map((it) => it.token.coinId)
        .value();

      const coinIds = _.chain(context.tokenTransfers)
        .map((it) => this.coingeckoService.coinIdOf(it.chain_id, it.address))
        .filter((it) => !!it)
        .uniq()
        .value();

      const coinPrices = await _.chain(coinIds)
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

  addNftMetadata() {
    return Rx.mergeMap(async (context: Context) => {
      const nftMetadatas = await _.chain(context.nftTransfers)
        .groupBy((it) => nftContractId(it.chain_id, it.token_address))
        .mapValues((it) => ({
          chainId: it[0].chain_id as ChainId,
          contractAddress: it[0].token_address,
        }))
        .map(async ({ chainId, contractAddress }) => {
          const moralisMetadata = await this.moralisService.nftMetadataOf(
            chainId,
            contractAddress,
          );

          if (moralisMetadata === undefined) {
            return undefined;
          }

          const metadata: NftCollectionMetadata = {
            chainId,
            contractAddress,
            logo: defaultLogo,
            name: moralisMetadata.name,
            symbol: moralisMetadata.symbol,
          };

          if (chainId !== 'eth') {
            return metadata;
          }

          const assetContract = await this.openseaService.metadataOf(
            contractAddress,
          );

          if (!assetContract) {
            return metadata;
          }

          return <NftCollectionMetadata>{
            ...metadata,
            logo: assetContract.image_url ?? defaultLogo,
            slug: assetContract.slug,
          };
        })
        .thru((promises) => Promise.all(promises))
        .value();

      return { ...context, nftMetadatas: nftMetadatas.filter((it) => !!it) };
    });
  }

  private emitPnlEventDocuments() {
    return Rx.tap((context: Context) => {
      const layers = [
        {
          id: 'nft-pnl-events-layer',
          collectionName: NFT_PNL_EVENTS,
          set: context.documents,
        },
      ];

      this.eventService.addLayers(context.clientId, layers);
    });
  }

  private emitPnlSummaryDocuments() {
    return Rx.tap((context: Context) => {
      const layers = [
        {
          id: 'nft-pnl-summaries-layer',
          collectionName: NFT_PNL_SUMMARIES,
          set: context.summaryDocuments,
        },
      ];

      this.eventService.addLayers(context.clientId, layers);
    });
  }

  private mapPnlSummaryDocuments() {
    return Rx.map((context: Context) => {
      const documentsByContractId = _.groupBy(
        context.documents,
        'nftCollectionId',
      );

      const summaryDocuments = _.entries(documentsByContractId)
        .map(([contractId, documents]) => {
          const chainMetadata = chains[documents[0].chainId];

          const costBasis = _.sumBy(documents, (it) => it.costBasisFiat || 0);
          const realizedGain = _.sumBy(
            documents,
            (it) => it.realizedGainFiat || 0,
          );
          const realizedValue = _.sumBy(
            documents,
            (it) => it.realizedValueFiat || 0,
          );

          const nftMetadata = context.nftMetadatas.find(
            (it) =>
              it.chainId === chainMetadata.id &&
              it.contractAddress === documents[0].nftCollectionAddress,
          );

          if (!nftMetadata) {
            return undefined;
          }

          const document: NftPnlSummaryDocument = {
            id: contractId,
            chainId: chainMetadata.id,
            chainLogo: chainMetadata.logo,
            chainName: chainMetadata.name,
            chainSymbol: chainMetadata.token.symbol,
            costBasisFiat: costBasis,
            fiatSymbol: context.selectedCurrency.symbol,
            links: {
              explorer: `nfts/realizedpnl/${nftMetadata.chainId}/${nftMetadata.contractAddress}`,
            },
            nftCollectionId: contractId,
            nftCollectionLogo: nftMetadata.logo,
            nftCollectionName: nftMetadata.name,
            nftCollectionSymbol: nftMetadata.symbol,
            realizedGainFiat: realizedValue - costBasis,
            realizedGainPc: (realizedValue - costBasis) / costBasis,
            realizedValueFiat: realizedValue,
            unrealizedCostFiat: 0, // TODO: not sure if this sum will be correct, not using it yet anyway
          };

          return document;
        })
        .filter((it) => !!it);

      return <Context>{ ...context, summaryDocuments };
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

      const ownTransactions = _.chain(await Promise.all(promises))
        .flatten()
        .map(
          (tx: moralis.Transaction) =>
            <EthersTransaction>{
              blockHash: tx.block_hash,
              blockNumber: Number(tx.block_number),
              chainId: tx.chain_id,
              confirmations: undefined,
              data: tx.input,
              from: tx.from_address,
              gasLimit: ethers.BigNumber.from(tx.gas),
              gasPrice: ethers.BigNumber.from(tx.gas_price),
              hash: tx.hash,
              nonce: Number(tx.nonce),
              receipt: {
                blockHash: tx.block_hash,
                blockNumber: Number(tx.block_hash),
                byzantium: undefined,
                confirmations: undefined,
                contractAddress: tx.receipt_contract_address,
                cumulativeGasUsed: ethers.BigNumber.from(
                  tx.receipt_cumulative_gas_used,
                ),
                effectiveGasPrice: undefined,
                from: tx.from_address,
                gasUsed: ethers.BigNumber.from(tx.receipt_gas_used),
                logs: undefined,
                logsBloom: undefined,
                root: tx.receipt_root,
                status: Number(tx.receipt_status),
                to: tx.to_address,
                transactionHash: tx.hash,
                transactionIndex: Number(tx.transaction_index),
                type: undefined,
              },
              timestamp: moment(tx.block_timestamp).unix(),
              to: tx.to_address,
              value: ethers.BigNumber.from(tx.value),
            },
        )
        .value();

      const transfersWithMissingTransactions = _.differenceWith(
        context.nftTransfers,
        ownTransactions,
        (a: moralis.NftTransfer, b: EthersTransaction) =>
          a.transaction_hash === b.hash,
      );

      const otherTransactions: EthersTransaction[] = await _.chain(
        transfersWithMissingTransactions,
      )
        .map((transfer) =>
          this.ethersService.transactionReceiptOf(
            transfer.chain_id,
            transfer.transaction_hash,
          ),
        )
        .thru((promises) => Promise.all(promises))
        .value();

      return <Context>{
        ...context,
        transactions: <EthersTransaction[]>[
          ...ownTransactions,
          ...otherTransactions,
        ],
      };
    });
  }

  private mapPnlEventDocuments() {
    return Rx.map((context: Context) => {
      const coinPriceMap = _.chain(context.coinPrices)
        .groupBy((it) => `${it.coinId}_${it.timestamp}`)
        .mapValues((it) => it[0])
        .value();

      const costBasisMap: {
        [contractId: string]: { [tokenId: number]: number };
      } = {};

      const transactionMap = _.chain(context.transactions)
        .groupBy((it) => it.hash)
        .mapValues((it) => it[0])
        .value();

      const tokenTransferMap = _.chain(context.tokenTransfers)
        .groupBy((it) => it.transaction_hash)
        .mapValues((it) => it[0])
        .value();

      const tokenMetadataMap = _.chain(context.tokenMetadatas)
        .groupBy((it) => tokenContractId(it.chainId, it.address))
        .mapValues((it) => it[0])
        .value();

      const documents = _.chain(context.nftTransfers)
        .sortBy((it) => Number(it.block_number))
        .map((transfer) => {
          if (
            context.watchedAddresses.includes(transfer.from_address) &&
            context.watchedAddresses.includes(transfer.to_address)
          ) {
            return undefined;
          }

          const transaction = transactionMap[transfer.transaction_hash];

          if (!transaction) {
            return undefined;
          }

          // // TODO: ignore deposits and withdrawals for now, as they will always be to your same wallet
          if (
            transaction.data.startsWith('0xd0e30db0') ||
            transaction.data.startsWith('0x2e1a7d4d') ||
            transaction.data.startsWith('0xb6b55f25')
          ) {
            return undefined;
          }

          const transactionStartOfDay = moment(transfer.block_timestamp)
            .utc()
            .startOf('day')
            .unix();

          if (!transactionStartOfDay) {
            return undefined;
          }

          const chainMetadata = chains[transfer.chain_id];

          const nativePrice =
            coinPriceMap[
              `${chainMetadata.token.coinId}_${transactionStartOfDay}`
            ];

          if (!nativePrice) {
            return undefined;
          }

          let tokenAmount = !!transfer.value
            ? Number(
                ethers.utils.formatUnits(
                  transfer.value,
                  chainMetadata.token.decimals,
                ),
              )
            : 0;

          let tokenPrice = nativePrice.price;

          let tokenSymbol = chainMetadata.token.symbol;

          if (!tokenAmount) {
            const tokenTransfer = tokenTransferMap[transfer.transaction_hash];

            if (!tokenTransfer) {
              return undefined;
            }

            const tokenMetadata =
              tokenMetadataMap[
                tokenContractId(tokenTransfer.chain_id, tokenTransfer.address)
              ];

            if (!tokenMetadata) {
              return undefined;
            }

            tokenAmount = !!tokenTransfer.value
              ? Number(
                  ethers.utils.formatUnits(
                    tokenTransfer.value,
                    tokenMetadata.decimals,
                  ),
                )
              : 0;

            tokenPrice =
              coinPriceMap[`${tokenMetadata.coinId}_${transactionStartOfDay}`]
                ?.price;

            if (!tokenPrice) {
              return undefined;
            }

            tokenSymbol = tokenMetadata.symbol;
          }

          const nftMetadata = context.nftMetadatas.find(
            (it) =>
              it.chainId === chainMetadata.id &&
              it.contractAddress === transfer.token_address,
          );

          if (!nftMetadata) {
            return undefined;
          }

          const contractId = nftContractId(
            transfer.chain_id,
            transfer.token_address,
          );

          const gasAmount = !!transaction.receipt.gasUsed
            ? Number(
                ethers.utils.formatEther(
                  transaction.receipt.gasUsed.mul(transaction.gasPrice),
                ),
              )
            : undefined;

          const gasValue: TokenValue = {
            tokenAmount: gasAmount,
            tokenPrice: nativePrice.price,
            tokenSymbol: chainMetadata.token.symbol,
            fiatSymbol: context.selectedCurrency.symbol,
            fiatAmount: nativePrice.price * gasAmount,
          };

          const fiatAmount = tokenAmount * tokenPrice;

          const tokenValue: Partial<TokenValue> = {
            tokenAmount,
            fiatSymbol: context.selectedCurrency.symbol,
            tokenPrice,
            tokenSymbol,
            fiatAmount,
          };

          let costBasis = undefined;
          let realizedGain = undefined;
          let realizedGainPc = undefined;
          let realizedValue = undefined;
          let unrealizedCost = 0;
          let icon = undefined;
          let description = 'Unknown, tell us on discord!';

          if (context.watchedAddresses.includes(transfer.from_address)) {
            description = `Sell Token #${transfer.token_id}`;

            icon = 'cil-arrow-circle-top';

            let prevCostBasis = 0;

            if (!!costBasisMap[contractId]) {
              prevCostBasis = costBasisMap[contractId][transfer.token_id] || 0;
            } else {
              costBasisMap[contractId] = {};
            }

            costBasisMap[contractId][transfer.token_id] = 0;

            realizedValue = fiatAmount;
            realizedGain = realizedValue - prevCostBasis;

            if (!!prevCostBasis) {
              realizedGainPc = realizedGain / prevCostBasis;
            }
          }

          if (context.watchedAddresses.includes(transfer.to_address)) {
            description = `Buy Token #${transfer.token_id}`;

            icon = 'cil-arrow-circle-bottom';

            costBasis = fiatAmount;

            if (!costBasisMap[contractId]) {
              costBasisMap[contractId] = {};
            }

            costBasisMap[contractId][transfer.token_id] = costBasis;
          }

          if (!!costBasisMap[contractId]) {
            unrealizedCost = _.sum(_.values(costBasisMap[contractId]));
          }

          const document: NftPnlEventDocument = {
            id: transfer.transaction_hash,
            blockNumber: Number(transfer.block_number),
            blockTimestamp: moment(transfer.block_timestamp).unix(),
            chainId: chainMetadata.id,
            chainLogo: chainMetadata.logo,
            chainName: chainMetadata.name,
            costBasisFiat: costBasis,
            description: _.truncate(description, { length: 24 }),
            fromAddress: transfer.from_address,
            gasNativeToken: gasValue.tokenAmount,
            gasFiat: gasValue.fiatAmount,
            icon, // TODO: add BUY / SELL icon
            links: {
              explorer: `${chainMetadata.explorer}tx/${transfer.transaction_hash}`,
            },
            nativeTokenPrice: gasValue.tokenPrice,
            nativeTokenSymbol: gasValue.tokenSymbol,
            nftCollectionAddress: transfer.token_address,
            nftCollectionId: contractId,
            nftCollectionLogo: nftMetadata.logo,
            nftCollectionName: nftMetadata.name,
            nftCollectionSymbol: nftMetadata.symbol,
            nftLogo: undefined, // TODO: how to get this?
            nftPriceToken: tokenValue.tokenAmount,
            nftPriceFiat: tokenValue.fiatAmount,
            realizedGainFiat: realizedGain,
            realizedGainPc,
            realizedValueFiat: realizedValue,
            saleTokenPrice: tokenValue.tokenPrice,
            saleTokenSymbol: tokenValue.tokenSymbol,
            toAddress: transfer.to_address,
            tokenId: transfer.token_id,
            unrealizedCostFiat: unrealizedCost,
          };

          return document;
        })
        .filter((it) => !!it)
        .value();

      return <Context>{ ...context, documents };
    });
  }

  private addNftTransfers() {
    return Rx.mergeMap(async (context: Context) => {
      const promises = [];

      for (const chain of context.chainIds) {
        for (const wallet of context.watchedAddresses) {
          promises.push(
            this.moralisService.nftTransfersOf(chain as ChainId, wallet),
          );
        }
      }

      const transfers: moralis.NftTransfer[] = _.flatten(
        await Promise.all(promises),
      );

      return <Context>{
        ...context,
        nftTransfers: transfers,
      };
    });
  }
}

interface Context extends BaseContext {
  readonly coinPrices?: CoinPrice[];
  readonly documents?: NftPnlEventDocument[];
  readonly nftMetadatas?: NftCollectionMetadata[];
  readonly tokenMetadatas?: TokenMetadata[];
  readonly summaryDocuments?: NftPnlSummaryDocument[];
  readonly transactions?: EthersTransaction[];
  readonly nftTransfers?: moralis.NftTransfer[];
  readonly tokenTransfers?: moralis.TokenTransfer[];
}
