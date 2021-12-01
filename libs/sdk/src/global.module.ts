import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BlockchainModule } from './blockchain/blockchain.module';
import { CurrencyModule } from './currency/currency.module';
import { GatewayModule } from './gateway/gateway.module';
import { LoggerModule } from './logger/logger.module';

@Module({
  imports: [
    BlockchainModule,
    CurrencyModule,
    EventEmitterModule.forRoot(),
    GatewayModule,
    LoggerModule,
  ],
  exports: [BlockchainModule, CurrencyModule, GatewayModule, LoggerModule],
})
export class GlobalModule {}
