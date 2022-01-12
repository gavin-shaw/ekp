import { ClientStateChangedEvent, CLIENT_STATE_CHANGED } from '@app/sdk';
import { getQueueToken } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { OnEvent } from '@nestjs/event-emitter';
import { QUEUE_NAMES } from './util/queue.names';

@Injectable()
export class QueueService {
  constructor(private moduleRef: ModuleRef) {}

  @OnEvent(CLIENT_STATE_CHANGED)
  async handleClientStateChangedEvent(
    clientStateChangedEvent: ClientStateChangedEvent,
  ) {
    for (const queueName of QUEUE_NAMES) {
      const queue = this.moduleRef.get(getQueueToken(queueName), {
        strict: false,
      });
      queue.add(clientStateChangedEvent);
    }
  }
}
