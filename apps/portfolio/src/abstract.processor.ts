import {
  ChainId,
  chains as allChains,
  ClientStateChangedEvent,
  CurrencyDto,
  logger,
} from '@app/sdk';
import { Process } from '@nestjs/bull';
import { Job } from 'bull';
import { validate } from 'bycontract';
import _ from 'lodash';
import moment from 'moment';
import * as Rx from 'rxjs';
import { ChainMetadata } from '../../../libs/sdk/src/util/ChainMetadata';
import { logErrors } from './util/logErrors';

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

    const hiddenChains =
      validate(event.state?.client.hiddenChains, 'Array.<string>=') ?? [];

    const chains = _.chain(allChains)
      .filter((it) => !hiddenChains.includes(it.id))
      .value();

    const chainIds = chains.map((it) => it.id);

    return Rx.from([
      <T>{
        chainIds,
        chains,
        clientId,
        selectedCurrency,
        watchedAddresses: watchedWallets
          .filter((it: { hidden: boolean }) => it.hidden !== true)
          .map((it: { address: string }) => it.address),
      },
    ]);
  }

  @Process()
  async handleClientStateChangedEvent(job: Job<ClientStateChangedEvent>) {
    const validatedContext = this.validateEvent(job.data);

    const pipedObservable = this.pipe(validatedContext);

    logger.log(`Handling job ${job.queue.name}`);

    const started = moment().unix();

    await Rx.firstValueFrom(pipedObservable.pipe(logErrors()));

    logger.log(
      `Job complete ${job.queue.name} in ${moment().unix() - started} seconds`,
    );
  }

  abstract pipe(source: Rx.Observable<T>): Rx.Observable<T>;
}

export interface BaseContext {
  readonly chainIds: ChainId[];
  readonly chains: ChainMetadata[];
  readonly clientId: string;
  readonly selectedCurrency: CurrencyDto;
  readonly watchedAddresses: string[];
}
