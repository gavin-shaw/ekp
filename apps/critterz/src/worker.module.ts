import { GlobalModule } from '@app/sdk';
import { BullModule, BullModuleOptions } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { PricesProcessor } from './prices/prices.processor';
import { RentalCheckerProcessor } from './rental-checker/rental-checker.processor';
import { UiProcessor } from './ui/ui.processor';
import { QUEUE_NAMES } from './util/queue.names';

@Module({
  imports: [
    GlobalModule,
    BullModule.registerQueue(
      ...QUEUE_NAMES.map((name: string) => <BullModuleOptions>{ name }),
    ),
  ],
  providers: [UiProcessor, RentalCheckerProcessor, PricesProcessor],
})
export class WorkerModule {}
