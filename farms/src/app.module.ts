import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainModule } from './blockchain/blockchain.module';
import { FarmModule } from './farm/farm.module';
import { GatewayModule } from '../libs/sdk/src/gateway/gateway.module';
import bscscan from 'bsc-scan';
import { GlobalModule } from './global.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SdkModule } from 'libs/sdk/src';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: ['dist/**/**.entity{.ts,.js}'],
      synchronize: true,
      ssl: process.env.DATABASE_SSL !== 'disable',
      extra:
        process.env.DATABASE_SSL !== 'disable'
          ? {
              ssl: {
                rejectUnauthorized: false,
              },
            }
          : undefined,
    }),
    EventEmitterModule.forRoot(),
    GlobalModule,
    FarmModule,
    SdkModule,
    BlockchainModule,
  ],
})
export class AppModule {
  onModuleInit() {
    bscscan.setUrl('https://api.bscscan.com');
    bscscan.setApiKey(process.env.BSCSCAN_API_KEY);
  }
}
