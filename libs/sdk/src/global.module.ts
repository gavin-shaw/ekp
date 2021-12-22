import { CacheModule, Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CoingeckoService } from './coingecko/coingecko.service';
import { EkConfigService } from './config/ek-config.service';
import { EventsService } from './events.service';
import { LimiterService } from './limiter.service';
import { MoralisService } from './moralis/moralis.service';
import { OpenseaService } from './opensea/opensea.service';
import { SocketsGateway } from './sockets/sockets.gateway';

const ClientProxyProvider = EkConfigService.createClientProxyProvider();

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.registerAsync({ useClass: EkConfigService }),
    MongooseModule.forRootAsync({ useClass: EkConfigService }),
  ],
  providers: [
    ClientProxyProvider,
    CoingeckoService,
    EkConfigService,
    EventsService,
    LimiterService,
    MoralisService,
    OpenseaService,
    SocketsGateway,
  ],
  exports: [
    ClientProxyProvider,
    CoingeckoService,
    EkConfigService,
    EventsService,
    LimiterService,
    MoralisService,
    OpenseaService,
  ],
})
export class GlobalModule {}
