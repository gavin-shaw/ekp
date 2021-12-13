import { GlobalModule } from '@app/sdk';
import { Module } from '@nestjs/common';
import { PluginService } from './plugin.service';
import { UiService } from './ui';
import { TokenService } from './token';
import { StorageService } from './storage';

@Module({
  imports: [GlobalModule],
  providers: [PluginService, StorageService, TokenService, UiService],
})
export class PortfolioModule {}
