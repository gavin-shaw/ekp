import { Module } from '@nestjs/common';
import { TokenClientService } from './token-client.service';

@Module({
  providers: [TokenClientService],
})
export class TokenModule {}
