import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NftTransfer, NftTransferSchema } from './model';
import { NftClientService } from './nft-client.service';
import { NftDatabaseService } from './nft-database.service';
import { NFT_PRICE_QUEUE } from './queues';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NftTransfer.name, schema: NftTransferSchema },
    ]),
    BullModule.registerQueue({ name: NFT_PRICE_QUEUE }),
  ],
  providers: [NftClientService, NftDatabaseService],
})
export class NftModule {}
