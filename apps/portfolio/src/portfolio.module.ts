import { GlobalModule } from '@app/sdk';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NftModule } from './nft/nft.module';
import { PluginService } from './plugin.service';
import { StorageService } from './storage';
import { TokenService } from './token';
import { UiService } from './ui';

if (!process.env.MONGO_HOST) {
  throw new Error('Environment variable MONGO_HOST is requried');
}

@Module({
  imports: [
    GlobalModule,
    MongooseModule.forRoot(`mongodb://${process.env.MONGO_HOST}/portfolio`), // TODO: move this into the SDK
    NftModule,
  ],
  providers: [PluginService, StorageService, TokenService, UiService],
})
export class PortfolioModule {}
