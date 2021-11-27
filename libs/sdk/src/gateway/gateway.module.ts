import { Module } from '@nestjs/common';
import { DefaultGateway } from './default.gateway';

@Module({
  providers: [DefaultGateway],
  exports: [DefaultGateway],
})
export class GatewayModule {}
