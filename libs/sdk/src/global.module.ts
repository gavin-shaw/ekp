import { BullModule } from '@nestjs/bull';
import { CacheModule, Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from 'nestjs-redis';
import { CoingeckoService } from './coingecko/coingecko.service';
import { EkConfigService } from './config/ek-config.service';
import { LimiterService } from './limiter.service';
import { MoralisService } from './moralis/moralis.service';
import { OpenseaService } from './opensea/opensea.service';
import { SocketGateway } from './socket/socket.gateway';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.registerAsync({ useClass: EkConfigService }),
    BullModule.forRootAsync({ useClass: EkConfigService }),
    EventEmitterModule.forRoot(),
    MongooseModule.forRootAsync({ useClass: EkConfigService }),
    RedisModule.forRootAsync(EkConfigService.createRedisAsyncOptions()),
  ],
  providers: [
    CoingeckoService,
    EkConfigService,
    LimiterService,
    MoralisService,
    OpenseaService,
    SocketGateway,
  ],
  exports: [
    CoingeckoService,
    EkConfigService,
    LimiterService,
    MoralisService,
    OpenseaService,
  ],
})
export class GlobalModule {}
