import { GlobalModule } from '@app/sdk';
import { Module } from '@nestjs/common';
import { PluginService } from './plugin.service';
import { UiService } from './ui';
import { TokenService } from './token';
import { StorageService } from './storage';
import { NftService } from './nft';

@Module({
  imports: [GlobalModule],
  providers: [
    NftService,
    PluginService,
    StorageService,
    TokenService,
    UiService,
  ],
})
export class PortfolioModule {}
