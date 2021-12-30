import { GlobalModule } from '@app/sdk';
import { Module } from '@nestjs/common';
import { NftModule } from './nft/nft.module';
import { TokenPnlProcessor } from './token/token-pnl.processor';
import { TokenModule } from './token/token.module';
import { UiModule } from './ui/ui.module';

@Module({
  imports: [GlobalModule, NftModule, TokenModule, TokenPnlProcessor, UiModule],
})
export class PortfolioModule {}
