import {
  ClientConnectedEvent,
  CLIENT_CONNECTED,
  UPDATE_METADATA,
} from '@app/sdk';
import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { validate } from 'bycontract';
import { metadata } from './metadata';

@Injectable()
export class PluginService {
  constructor(private eventEmitter: EventEmitter2) {}

  @OnEvent(CLIENT_CONNECTED)
  async handleClientConnectedEvent(clientEvent: ClientConnectedEvent) {
    validate([clientEvent.clientId, clientEvent.state], ['string', 'object']);

    this.eventEmitter.emit(UPDATE_METADATA, {
      clientId: clientEvent.clientId,
      ...metadata,
    });
  }
}
