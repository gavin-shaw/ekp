import {
  chainIds,
  chains,
  ClientStateChangedEvent,
  CLIENT_STATE_CHANGED,
  CoingeckoService,
  formatters,
  MoralisService,
  moralis,
  OpenseaService,
  logger,
} from '@app/sdk';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { validate } from 'bycontract';
import _ from 'lodash';
import moment from 'moment';
import { NftContractDocument } from './dto';
import { NftDatabaseService } from './nft-database.service';
import { NftEmitterService } from './nft-emitter.service';

@Injectable()
export class NftService {
  constructor(
    private coingeckoService: CoingeckoService,
    private moralisService: MoralisService,
    private nftDatabaseService: NftDatabaseService,
    private nftEmitterService: NftEmitterService,
    private openseaService: OpenseaService,
  ) {}

  private clientsSyncingPrices: string[];

  @OnEvent(CLIENT_STATE_CHANGED)
  async handleClientStateChangedEvent(
    clientStateChangedEvent: ClientStateChangedEvent,
  ) {
    const clientId = validate(clientStateChangedEvent.clientId, 'string');

    const selectedCurrency = validate(
      clientStateChangedEvent.state?.client.selectedCurrency,
      'object',
    );

    const watchedWallets = validate(
      clientStateChangedEvent.state?.client.watchedWallets,
      'Array.<object>',
    );

    const requestPromises = [];

    for (const chainId of chainIds) {
      for (const watchedWallet of watchedWallets) {
        const address = validate(watchedWallet.address, 'string');

        requestPromises.push(this.moralisService.nftsOf(chainId, address));
      }
    }

    const nfts: moralis.NftOwner[] = _.flatten(
      await Promise.all(requestPromises),
    );

    let contracts = this.createNftContractDocuments(nfts);

    contracts = await Promise.all(
      contracts
        .filter((it) => it.chain.id === 'eth')
        .map(async (contract) => {
          const metadata = await this.openseaService.metadataOf(
            contract.contractAddress,
          );
          if (!metadata?.image_url) {
            return contract;
          }
          return {
            ...contract,
            logo: metadata.image_url,
          };
        }),
    );

    await this.nftEmitterService.emitContractDocuments(clientId, contracts);

    await this.syncPrices(selectedCurrency, contracts, clientId);
  }

  private async syncPrices(
    selectedCurrency: any,
    contracts: NftContractDocument[],
    clientId: any,
  ) {
    if (this.clientsSyncingPrices.includes(clientId)) {
      return;
    }

    try {
      this.clientsSyncingPrices.push(clientId);

      const chainCoinIds = Object.values(chains).map((it) => it.token.coinId);

      const chainCoinPrices = await this.coingeckoService.latestPricesOf(
        chainCoinIds.filter((it) => !!it),
        selectedCurrency.id,
      );

      await Promise.all(
        contracts.map(async (contract) => {
          const latestTransfer = await this.nftDatabaseService.latestTransferOf(
            contract.id,
          );

          let cursor = latestTransfer?.cursor;

          while (true) {
            const { cursor: newCursor, transfers: moralisTransfers } =
              await this.moralisService.nextTransfersOf(
                contract.chain.id,
                contract.contractAddress,
                cursor,
              );

            if (
              !newCursor ||
              !Array.isArray(moralisTransfers) ||
              moralisTransfers.length === 0
            ) {
              break;
            }

            const transfers = this.nftDatabaseService.mapMoralisTransfers(
              contract,
              moralisTransfers,
              cursor,
            );

            await this.nftDatabaseService.saveTransfers(transfers);

            const latestTimestamp = Math.max(
              ...transfers
                .map((transfer) => transfer.blockTimestamp)
                .filter((it) => !!it),
            );

            if (isNaN(latestTimestamp)) {
              logger.warn(
                'Skipping patch sync state due to missing block timestamp in transfers',
              );
            } else {
              contract.fetchTimestamp = latestTimestamp;

              this.nftEmitterService.patchSyncState(clientId, contract);
            }

            cursor = newCursor;
          }

          const now = moment().unix();

          let transfers =
            await this.nftDatabaseService.latestTransfersWithValueOf(
              contract.id,
              now - 3600,
            );

          if (transfers.length === 0) {
            transfers = [
              await this.nftDatabaseService.latestTransferWithValueOf(
                contract.id,
              ),
            ];
          }

          if (transfers.length > 0) {
            const price = Math.min(
              ...transfers
                .map((transfer) => transfer.value)
                .filter((it) => !isNaN(it)),
            );

            const value = price * contract.balance;
            const chainCoinPrice = chainCoinPrices.find(
              (it) => it.coinId === chains[contract.chain.id].token.coinId,
            );
            const valueFiat = value * chainCoinPrice.price;

            await this.nftEmitterService.patchPrice(clientId, {
              ...contract,
              price,
              priceFormatted: formatters.tokenValue(price),
              value,
              valueFormatted: formatters.tokenValue(value),
              valueFiat,
              valueFiatFormatted: formatters.currencyValue(
                valueFiat,
                selectedCurrency.symbol,
              ),
            });
          }
        }),
      );
    } finally {
      _.remove(this.clientsSyncingPrices, (it) => it === clientId);
    }
  }

  private createNftContractDocuments(
    nfts: moralis.NftOwner[],
  ): NftContractDocument[] {
    const byContractAddress = _.groupBy(
      nfts,
      (nft) => `${nft.chain_id}_${nft.token_address}`,
    );

    const now = moment().unix();

    return Object.entries(byContractAddress).map(([id, nfts]) => {
      const balance = _.sumBy(nfts, 'amount');

      const chainMetadata = chains[nfts[0].chain_id];

      return {
        id,
        created: now,
        updated: now,
        balance,
        balanceFormatted: `${Math.floor(balance)} nfts`,
        chain: {
          id: chainMetadata.id,
          logo: chainMetadata.logo,
          name: chainMetadata.name,
        },
        contractAddress: nfts[0].token_address,
        nfts: nfts.map((nft) => ({ tokenId: nft.token_id })),
        price: 0,
        priceFormatted: '?',
        name: nfts[0].name,
        ownerAddresses: nfts.map((nft) => nft.owner_of),
        symbol: nfts[0].symbol,
        value: 0,
        valueFormatted: 'Price ?',
        valueFiat: 0,
        valueFiatFormatted: 'Price ?',
      };
    });
  }
}
