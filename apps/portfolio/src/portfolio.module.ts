import { GlobalModule } from '@app/sdk';
import { Module } from '@nestjs/common';
import { PortfolioGateway } from './portfolio.gateway';
import { PortfolioTokenService } from './token';
import { PortfolioUiService } from './ui';

@Module({
  imports: [GlobalModule],
  providers: [PortfolioGateway, PortfolioTokenService, PortfolioUiService],
})
export class PortfolioModule {}
