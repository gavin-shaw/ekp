import { Module } from '@nestjs/common';
import { GatewayModule } from './gateway/gateway.module';

@Module({
  imports: [GatewayModule],
  providers: [],
  exports: [],
})
export class SdkModule {}
