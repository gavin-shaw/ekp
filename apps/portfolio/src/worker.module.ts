import { GlobalModule } from '@app/sdk';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { NftBalanceProcessor } from './nft/nft-balance.processor';
import {
  NFT_BALANCE_QUEUE,
  TOKEN_BALANCE_QUEUE,
  TOKEN_PNL_QUEUE,
  UI_QUEUE,
} from './queues';
import { TokenBalanceProcessor } from './token/token-balance.processor';
import { TokenPnlProcessor } from './token/token-pnl.processor';
import { UiProcessor } from './ui/ui.processor';

@Module({
  imports: [
    GlobalModule,
    BullModule.registerQueue(
      { name: NFT_BALANCE_QUEUE },
      { name: TOKEN_BALANCE_QUEUE },
      { name: TOKEN_PNL_QUEUE },
      { name: UI_QUEUE },
    ),
  ],
  providers: [
    NftBalanceProcessor,
    TokenBalanceProcessor,
    TokenPnlProcessor,
    UiProcessor,
  ],
})
export class WorkerModule {}
