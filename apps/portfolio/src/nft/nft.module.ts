import { Module } from '@nestjs/common';
import { NftDatabaseService } from './nft-database.service';
import { NftService } from './nft.service';
import { NftEmitterService } from './nft-emitter.service';
import { GlobalModule } from '@app/sdk';
import { MongooseModule } from '@nestjs/mongoose';
import { NftTransfer, NftTransferSchema } from './model';

@Module({
  imports: [
    GlobalModule,
    MongooseModule.forFeature([
      { name: NftTransfer.name, schema: NftTransferSchema },
    ]),
  ],
  providers: [NftService, NftDatabaseService, NftEmitterService],
  exports: [NftService],
})
export class NftModule {}
