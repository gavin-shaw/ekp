import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CoingeckoModule } from './coingecko/coingecko.module';
import { EvmModule } from './evm/evm.module';
import { SocketsModule } from './sockets/sockets.module';
@Module({
  imports: [
    CoingeckoModule,
    EventEmitterModule.forRoot(),
    EvmModule,
    SocketsModule,
  ],
  exports: [CoingeckoModule, EvmModule, SocketsModule],
})
export class GlobalModule {}
