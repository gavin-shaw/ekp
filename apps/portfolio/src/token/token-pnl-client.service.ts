import {
  ADD_LAYERS,
  ChainId,
  chains,
  ClientStateChangedEvent,
  CLIENT_STATE_CHANGED,
  CoingeckoService,
  CoinPrice,
  CurrencyDto,
  logger,
  moralis,
  MoralisService,
} from '@app/sdk';
import { TokenMetadata } from '@app/sdk/moralis/model';
import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { validate } from 'bycontract';
import { ethers } from 'ethers';
import _ from 'lodash';
import moment from 'moment';
import * as Rx from 'rxjs';
import { TokenPnlItem } from './dtos/token-pnl-item.document';

@Injectable()
export class TokenStatementClientService {
  constructor(
    private coingeckoService: CoingeckoService,
    private eventEmitter: EventEmitter2,
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

  @OnEvent(CLIENT_STATE_CHANGED)
  async handleClientStateChangedEvent(
    clientStateChangedEvent: ClientStateChangedEvent,
  ) {
    const { clientId, selectedCurrency, watchedWallets } = this.validateEvent(
      clientStateChangedEvent,
    );

    await Rx.lastValueFrom(
      Rx.combineLatest([
        this.getAllTransfersOf(watchedWallets),
        this.getAllTransactionsOf(watchedWallets),
      ]).pipe(
        Rx.mergeMap(async ([transfers, transactions]) => ({
          transfers,
          transactions,
          tokens: await this.getTokenMetadata(transfers),
        })),
        Rx.mergeMap(({ transfers, transactions, tokens }) =>
          this.mapPnlItems(
            transfers,
            transactions,
            tokens,
            selectedCurrency,
            watchedWallets,
          ),
        ),
        Rx.tap((documents) => this.emitDocuments(documents, clientId)),
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

  emitDocuments(documents: TokenPnlItem[], clientId: string) {
    const layers = [
      {
        id: 'token-pnl-layer',
        collectionName: 'token_pnl_items',
        set: documents,
      },
    ];

    this.eventEmitter.emit(ADD_LAYERS, {
      channelId: clientId,
      layers,
    });
  }

  getTokenMetadata(
    transfers: moralis.TokenTransfer[],
  ): Promise<moralis.TokenMetadata[]> {
    return Promise.all(
      _.chain(transfers)
        .uniqBy((it) => `${it.chain_id}_${it.address}`)
        .map((it) =>
          this.moralisService.tokenMetadataOf(it.chain_id, it.address),
        )
        .value(),
    );
  }

  private async mapPnlItems(
    transfers: moralis.TokenTransfer[],
    transactions: moralis.Transaction[],
    tokens: TokenMetadata[],
    selectedCurrency: CurrencyDto,
    watchedWallets: { address: string }[],
  ): Promise<TokenPnlItem[]> {
    validate(
      [transfers, transactions, tokens, selectedCurrency, watchedWallets],
      [
        'Array.<object>',
        'Array.<object>',
        'Array.<object>',
        'object',
        'Array.<object>',
      ],
    );

    const watchedAddresses = watchedWallets.map((it) =>
      it.address.toLowerCase(),
    );

    return Promise.all(
      transfers.map(async (transfer) => {
        const coinId = this.coingeckoService.coinIdOf(
          transfer.chain_id,
          transfer.address,
        );

        const transaction = transactions.find(
          (it) => it.hash === transfer.transaction_hash,
        );

        if (!transaction) {
          return undefined;
        }

        // TODO: maybe include coins that are not on coingecko
        if (!coinId) {
          return undefined;
        }

        const chainMetadata = chains[transfer.chain_id];

        const date = moment(transfer.block_timestamp).format('DD-MM-YYYY');

        const tokenPrice: CoinPrice =
          await this.coingeckoService.historicPriceOf(
            coinId,
            selectedCurrency.id,
            date,
          );

        const chainPrice: CoinPrice =
          await this.coingeckoService.historicPriceOf(
            chainMetadata.token.coinId,
            selectedCurrency.id,
            date,
          );

        const gas = Number(
          ethers.utils.formatEther(
            ethers.BigNumber.from(transaction.gas_price).mul(
              Number(transaction.receipt_gas_used),
            ),
          ),
        );

        const gasFiat = !!chainPrice ? chainPrice.price * gas : undefined;

        const token = tokens.find(
          (it) =>
            it.chain_id === transfer.chain_id &&
            it.address.toLowerCase() === transfer.address.toLowerCase(),
        );

        const value = !!transfer.value
          ? Number(ethers.utils.formatEther(transfer.value))
          : undefined;

        const valueFiat = !!tokenPrice ? tokenPrice.price * value : undefined;

        let description = 'Unknown';

        const matchedTransfers = transfers.filter(
          (it) => it.transaction_hash === transfer.transaction_hash,
        );

        if (matchedTransfers.length === 1) {
          if (watchedAddresses.includes(transfer.from_address.toLowerCase())) {
            description = `Withdraw ${token?.symbol}`;
          } else if (
            watchedAddresses.includes(transfer.to_address.toLowerCase())
          ) {
            description = `Deposit ${token?.symbol}`;
          }
        }
        if (matchedTransfers.length === 2) {
          const fromTransfer = matchedTransfers.find((it) =>
            watchedAddresses.includes(it.from_address.toLowerCase()),
          );

          const toTransfer = matchedTransfers.find((it) =>
            watchedAddresses.includes(it.to_address.toLowerCase()),
          );

          if (!!fromTransfer && !!toTransfer) {
            const fromToken = tokens.find(
              (it) =>
                it.address === fromTransfer.address &&
                it.chain_id === fromTransfer.chain_id,
            );

            const toToken = tokens.find(
              (it) =>
                it.address === toTransfer.address &&
                it.chain_id === toTransfer.chain_id,
            );

            if (!!fromToken && !!toToken) {
              description = `Swap ${fromToken?.symbol} to ${toToken?.name}`;
            }
          }
        }

        return <TokenPnlItem>{
          blockNumber: Number(transfer.block_number),
          chainName: chainMetadata.name,
          chainFiatRate: chainPrice?.price,
          description,
          fiatRate: tokenPrice?.price,
          gas,
          gasFiat, // TODO: calculate gasFiat at the client
          fiatSymbol: selectedCurrency.symbol,
          links: {
            transaction: `${chainMetadata.explorer}tx/${transfer.transaction_hash}`,
          },
          realized: 0, // TODO: implement realized field for token line
          realizedPc: 0, // TODO: implement realized pc field for token line
          timestamp: moment(transfer.block_timestamp).unix(),
          token: !!token
            ? {
                coinId,
                decimals: Number(token.decimals),
                name: token.name,
                symbol: token.symbol,
              }
            : undefined,
          value,
          valueFiat, // TODO: calculate value fiat at the client
        };
      }),
    ).then((its) => its.filter((it) => !!it));
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
