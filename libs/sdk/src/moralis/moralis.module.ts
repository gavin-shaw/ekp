import { Module } from '@nestjs/common';
import { MoralisService } from './moralis.service';

@Module({
  providers: [MoralisService],
  exports: [MoralisService],
})
export class MoralisModule {}
