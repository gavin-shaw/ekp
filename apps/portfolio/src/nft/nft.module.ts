import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NftTransfer, NftTransferSchema } from './model';
import { NftClientService } from './nft-client.service';
import { NftDatabaseService } from './nft-database.service';
import { NftPriceProcessor } from './nft-price.processor';
import { NFT_PRICE_QUEUE } from './queues';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NftTransfer.name, schema: NftTransferSchema },
    ]),
    BullModule.registerQueue({ name: NFT_PRICE_QUEUE }),
  ],
  providers: [NftClientService, NftPriceProcessor, NftDatabaseService],
})
export class NftModule {}
