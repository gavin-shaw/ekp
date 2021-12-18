import { CacheModule, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { CoingeckoModule } from './coingecko/coingecko.module';
import { EvmModule } from './evm/evm.module';
import { MoralisModule } from './moralis/moralis.module';
import { SocketsModule } from './sockets/sockets.module';
import * as redisStore from 'cache-manager-redis-store';

const cacheOptions = !!process.env.REDIS_HOST
  ? {
      isGlobal: true,
      store: redisStore,
      host: process.env.REDIS_HOST,
      port: process.env.PORT,
      ttl: 0,
    }
  : {
      isGlobal: true,
      ttl: 0,
    };

@Module({
  imports: [
    CacheModule.register(cacheOptions),
    CoingeckoModule,
    EventEmitterModule.forRoot(),
    EvmModule,
    MoralisModule,
    SocketsModule,
  ],
  exports: [CoingeckoModule, EvmModule, SocketsModule],
})
export class GlobalModule {}
