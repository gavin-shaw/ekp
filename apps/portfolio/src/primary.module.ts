import { SocketModule } from '@app/sdk';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import {
  NFT_BALANCE_QUEUE,
  TOKEN_BALANCE_QUEUE,
  TOKEN_PNL_QUEUE,
  UI_QUEUE,
} from './queues';
import { SocketService } from './socket.service';

@Module({
  imports: [
    SocketModule,
    BullModule.registerQueue(
      { name: NFT_BALANCE_QUEUE },
      { name: TOKEN_BALANCE_QUEUE },
      { name: TOKEN_PNL_QUEUE },
      { name: UI_QUEUE },
    ),
  ],
  providers: [SocketService],
})
export class PrimaryModule {}
