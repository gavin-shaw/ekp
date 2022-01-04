import { ClientStateChangedEvent, CurrencyDto } from '@app/sdk';
import { Process } from '@nestjs/bull';
import { Job } from 'bull';
import { validate } from 'bycontract';

import * as Rx from 'rxjs';
import { logErrors } from './util/logErrors';

export interface BaseContext {
  readonly clientId: string;
  readonly watchedAddresses: string[];
  readonly selectedCurrency: CurrencyDto;
}

export abstract class AbstractProcessor<T extends BaseContext> {
  protected validateEvent(event: ClientStateChangedEvent): Rx.Observable<T> {
    const clientId = validate(event.clientId, 'string');

    const selectedCurrency = validate(
      event.state?.client.selectedCurrency,
      'object',
    );

    const watchedWallets = validate(
      event.state?.client.watchedWallets,
      'Array.<object>',
    );

    return Rx.from([
      <T>{
        clientId,
        selectedCurrency,
        watchedAddresses: watchedWallets.map((it: { address: string }) =>
          it.address.toLowerCase(),
        ),
      },
    ]);
  }

  @Process()
  async handleClientStateChangedEvent(job: Job<ClientStateChangedEvent>) {
    const validatedContext = this.validateEvent(job.data);

    const pipedObservable = this.pipe(validatedContext);

    await Rx.firstValueFrom(pipedObservable.pipe(logErrors()));
  }

  abstract pipe(source: Rx.Observable<T>): Rx.Observable<T>;
}
