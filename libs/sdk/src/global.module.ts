import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CurrencyModule } from './currency/currency.module';
import { EvmModule } from './evm/evm.module';
import { LoggerModule } from './logger/logger.module';
import { SocketsModule } from './sockets/sockets.module';
@Module({
  imports: [
    CurrencyModule,
    EventEmitterModule.forRoot(),
    EvmModule,
    SocketsModule,
    LoggerModule,
  ],
  exports: [CurrencyModule, EvmModule, SocketsModule, LoggerModule],
})
export class GlobalModule {}
