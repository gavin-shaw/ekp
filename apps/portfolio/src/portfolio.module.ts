import { GlobalModule } from '@app/sdk';
import { Module } from '@nestjs/common';
import { NftModule } from './nft/nft.module';
import { TokenStatementClientService } from './token/token-pnl-client.service';
import { TokenModule } from './token/token.module';
import { UiModule } from './ui/ui.module';

@Module({
  imports: [
    GlobalModule,
    NftModule,
    TokenModule,
    TokenStatementClientService,
    UiModule,
  ],
})
export class PortfolioModule {}
