import {
  ADD_LAYERS,
  chains,
  CoingeckoService,
  logger,
  moralis,
  MoralisService,
  PUBLISH_CLIENT,
} from '@app/sdk';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { validate } from 'bycontract';
import { Redis } from 'ioredis';
import _ from 'lodash';
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

    let transferCount = await this.nftDatabaseService.transferCount(
      contract.id,
    );

    while (true) {
      const moralisTransfers: moralis.NftTransfer[] =
        await this.moralisService.nftTransfersOf(
          contract.chain.id,
          contract.contractAddress,
          transferCount,
        );

      if (moralisTransfers.length === 0) {
        break;
      }

      const transfers = this.nftDatabaseService.mapMoralisTransfers(
        contract,
        moralisTransfers,
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
        const price = await this.nftDatabaseService.priceOf(contract.id);

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
              {
                id: contract.id,
                price,
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

      transferCount += transfers.length;
    }

    const price = await this.nftDatabaseService.priceOf(contract.id);

    if (!!price) {
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
