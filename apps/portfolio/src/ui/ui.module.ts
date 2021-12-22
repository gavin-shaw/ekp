import { Module } from '@nestjs/common';
import { UiClientService } from './ui-client.service';

@Module({
  providers: [UiClientService],
})
export class UiModule {}
