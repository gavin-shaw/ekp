import { Module } from '@nestjs/common';
import { OpenseaService } from './opensea.service';

@Module({
  providers: [OpenseaService],
  exports: [OpenseaService],
})
export class OpenseaModule {}
