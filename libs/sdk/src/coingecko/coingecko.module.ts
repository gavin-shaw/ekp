import { Module } from '@nestjs/common';
import { CoingeckoService } from './coingecko.service';

@Module({
  providers: [CoingeckoService],
  exports: [CoingeckoService],
})
export class CoingeckoModule {}
