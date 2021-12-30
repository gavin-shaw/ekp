import { ClientStateChangedEvent, CLIENT_STATE_CHANGED } from '@app/sdk';
import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bull';
import {
  NFT_BALANCE_QUEUE,
  TOKEN_BALANCE_QUEUE,
  TOKEN_PNL_QUEUE,
  UI_QUEUE,
} from './queues';

@Injectable()
export class SocketService {
  constructor(
    @InjectQueue(NFT_BALANCE_QUEUE) private nftBalanceQueue: Queue,
    @InjectQueue(TOKEN_BALANCE_QUEUE) private tokenBalanceQueue: Queue,
    @InjectQueue(TOKEN_PNL_QUEUE) private tokenPnlQueue: Queue,
    @InjectQueue(UI_QUEUE) private uiQueue: Queue,
  ) {}

  @OnEvent(CLIENT_STATE_CHANGED)
  async handleClientStateChangedEvent(
    clientStateChangedEvent: ClientStateChangedEvent,
  ) {
    this.nftBalanceQueue.add(clientStateChangedEvent);
    this.tokenBalanceQueue.add(clientStateChangedEvent);
    this.tokenPnlQueue.add(clientStateChangedEvent);
    this.uiQueue.add(clientStateChangedEvent);
  }
}
