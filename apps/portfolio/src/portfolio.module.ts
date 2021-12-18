import { GlobalModule } from '@app/sdk';
import { Module } from '@nestjs/common';
import { NftService } from './nft';
import { PluginService } from './plugin.service';
import { StorageService } from './storage';
import { TokenService } from './token';
import { UiService } from './ui';

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
