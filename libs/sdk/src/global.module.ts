import { Logger, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BlockchainModule } from './blockchain/blockchain.module';
import { CurrencyModule } from './currency/currency.module';
import { GatewayModule } from './gateway/gateway.module';

@Module({
  imports: [
    BlockchainModule,
    CurrencyModule,
    GatewayModule,
    EventEmitterModule.forRoot(),
  ],
  providers: [Logger],
  exports: [BlockchainModule, CurrencyModule, GatewayModule, Logger],
})
export class GlobalModule {}
