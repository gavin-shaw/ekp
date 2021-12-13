import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BlockchainModule } from './blockchain/blockchain.module';
import { CurrencyModule } from './currency/currency.module';
import { SocketsModule } from './sockets/sockets.module';
import { LoggerModule } from './logger/logger.module';

@Module({
  imports: [
    BlockchainModule,
    CurrencyModule,
    EventEmitterModule.forRoot(),
    SocketsModule,
    LoggerModule,
  ],
  exports: [BlockchainModule, CurrencyModule, SocketsModule, LoggerModule],
})
export class GlobalModule {}
