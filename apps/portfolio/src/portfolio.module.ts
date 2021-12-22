import { GlobalModule } from '@app/sdk';
import { Module } from '@nestjs/common';
import { NftModule } from './nft/nft.module';
import { TokenModule } from './token/token.module';
import { UiModule } from './ui/ui.module';

@Module({
  imports: [GlobalModule, NftModule, TokenModule, UiModule],
})
export class PortfolioModule {}
