import { logger } from '@app/sdk';
import * as Rx from 'rxjs';

export function logErrors() {
  return Rx.catchError((error) => {
    logger.error(error);
    console.log(error.stack);
    return Rx.of();
  });
}
