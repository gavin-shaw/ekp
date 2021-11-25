import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainModule } from './blockchain/blockchain.module';
import { FarmModule } from './farm/farm.module';
import { GatewayModule } from './gateway/gateway.module';
import bscscan from 'bsc-scan';
import { GlobalModule } from './global.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: ['dist/**/**.entity{.ts,.js}'],
      synchronize: true,
      ssl: true,
      extra: {
        ssl: {
          rejectUnauthorized: false,
        },
      },
    }),
    EventEmitterModule.forRoot(),
    GlobalModule,
    FarmModule,
    GatewayModule,
    BlockchainModule,
  ],
})
export class AppModule {
  onModuleInit() {
    bscscan.setUrl('https://api.bscscan.com');
    bscscan.setApiKey(process.env.BSCSCAN_API_KEY);
  }
}
