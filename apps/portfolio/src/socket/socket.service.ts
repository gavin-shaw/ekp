import { ClientStateChangedEvent, CLIENT_STATE_CHANGED } from '@app/sdk';
import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bull';

@Injectable()
export class SocketService {
  constructor(
    @InjectQueue('token-balance') private tokenBalanceQueue: Queue,
    @InjectQueue('nft-balance') private nftBalanceQueue: Queue,
    @InjectQueue('token-pnl') private tokenPnlQueue: Queue,
  ) {}

  @OnEvent(CLIENT_STATE_CHANGED)
  async handleClientStateChangedEvent(
    clientStateChangedEvent: ClientStateChangedEvent,
  ) {
    this.tokenBalanceQueue.add(clientStateChangedEvent);
    this.nftBalanceQueue.add(clientStateChangedEvent);
    this.tokenPnlQueue.add(clientStateChangedEvent);
  }
}
