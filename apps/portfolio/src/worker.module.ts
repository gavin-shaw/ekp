import { GlobalModule } from '@app/sdk';
import { BullModule, BullModuleOptions } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { NftBalanceProcessor } from './nft/nft-balance.processor';
import { NftPnlProcessor } from './nft/nft-pnl.processor';
import { QUEUE_NAMES } from './queues';
import { TokenBalanceProcessor } from './token/token-balance.processor';
import { TokenPnlProcessor } from './token/token-pnl.processor';
import { UiProcessor } from './ui/ui.processor';
@Module({
  imports: [
    GlobalModule,
    BullModule.registerQueue(
      ...QUEUE_NAMES.map((name: string) => <BullModuleOptions>{ name }),
    ),
  ],
  providers: [
    NftBalanceProcessor,
    NftPnlProcessor,
    TokenBalanceProcessor,
    TokenPnlProcessor,
    UiProcessor,
  ],
})
export class WorkerModule {}
