import {
  ADD_LAYERS,
  chains,
  CoingeckoService,
  logger,
  MoralisService,
  PUBLISH_CLIENT,
} from '@app/sdk';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { validate } from 'bycontract';
import { Redis } from 'ioredis';
import moment from 'moment';
import { RedisService } from 'nestjs-redis';
import { NftContractDocument } from './dto/nft-contract.document';
import { NftDatabaseService } from './nft-database.service';
import { NFT_PRICE_QUEUE } from './queues';

@Processor(NFT_PRICE_QUEUE)
export class NftPriceProcessor {
  constructor(
    private coingeckoService: CoingeckoService,
    private moralisService: MoralisService,
    private nftDatabaseService: NftDatabaseService,
    redisService: RedisService,
  ) {
    this.publishClient = redisService.getClient(PUBLISH_CLIENT);
  }

  private readonly publishClient: Redis;

  @Process({ concurrency: 16 })
  async process(job: Job<any>) {
    const selectedCurrency = validate(job.data.selectedCurrency, 'object');
    const contract: NftContractDocument = validate(job.data.contract, 'object');

    const latestTransfer = await this.nftDatabaseService.latestTransferOf(
      contract.id,
    );

    logger.log(
      `Starting to fetch ${contract.name} from ${moment
        .unix(latestTransfer.blockTimestamp)
        .format()}`,
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

      if (isNaN(latestTimestamp) || latestTimestamp <= 0) {
        logger.warn(
          'Skipping patch sync state due to missing block timestamp in transfers',
        );
      } else {
        const layers = [
          {
            id: `nfts-sync-state-${contract.id}`,
            tags: ['nfts-sync-state'],
            collectionName: 'nfts',
            patch: [
              {
                id: contract.id,
                fetchTimestamp: latestTimestamp,
              },
            ],
          },
        ];

        this.publishClient.publish(
          ADD_LAYERS,
          JSON.stringify({
            channelId: contract.id,
            layers,
          }),
        );
      }

      if (transfers.length < 0) {
        break;
      }

      cursor = newCursor;
    }

    const now = moment().unix();

    console.log('here7');

    let transfers = await this.nftDatabaseService.latestTransfersWithValueOf(
      contract.id,
      now - 3600,
    );

    if (transfers.length === 0) {
      transfers = [
        await this.nftDatabaseService.latestTransferWithValueOf(contract.id),
      ];
    }

    if (transfers.length > 0) {
      const chainCoinIds = Object.values(chains).map((it) => it.token.coinId);

      const chainCoinPrices = await this.coingeckoService.latestPricesOf(
        chainCoinIds.filter((it) => !!it),
        selectedCurrency.id,
      );

      const price = Math.min(
        ...transfers
          .map((transfer) => transfer.value)
          .filter((it) => !isNaN(it)),
      );

      const chainCoinPrice = chainCoinPrices.find(
        (it) => it.coinId === chains[contract.chain.id].token.coinId,
      );

      const layers = [
        {
          id: `nfts-price-${contract.contractAddress}`,
          tags: ['nfts-price'],
          collectionName: 'nfts',
          patch: [
            {
              id: contract.id,
              price,
            },
            {
              id: contract.id,
              priceFiat: {
                _eval: true,
                scope: {
                  price: '$.price',
                  rate: chainCoinPrice.price,
                },
                expression: 'rate * price',
              },
              value: {
                _eval: true,
                scope: {
                  price: '$.price',
                  balance: '$.balance',
                },
                expression: 'balance * price',
              },
            },
            {
              id: contract.id,
              valueFiat: {
                _eval: true,
                scope: {
                  value: '$.value',
                  rate: chainCoinPrice.price,
                },
                expression: 'rate * value',
              },
            },
          ],
        },
      ];

      this.publishClient.publish(
        ADD_LAYERS,
        JSON.stringify({
          channelId: contract.id,
          layers,
        }),
      );
    }
  }
}
