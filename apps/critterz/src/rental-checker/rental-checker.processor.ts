import { AbstractProcessor, BaseContext, EventService } from '@app/sdk';
import { Processor } from '@nestjs/bull';
import * as Rx from 'rxjs';
import { Observable } from 'rxjs';
import { RENTAL_CHECKER_DOCUMENT } from '../util/collectionNames';
import { RENTAL_CHECK_QUEUE } from '../util/queue.names';
import { RentalCheckerDocument } from './rental-checker.document';

@Processor(RENTAL_CHECK_QUEUE)
export class RentalCheckerProcessor extends AbstractProcessor<Context> {
  constructor(private eventService: EventService) {
    super();
  }

  pipe(source: Observable<BaseContext>): Observable<BaseContext> {
    return source.pipe(this.mapRentalCheckerDocuments(), this.emitDocuments());
  }

  private mapRentalCheckerDocuments() {
    return Rx.mergeMap(async (context: Context) => {
      const sellerAddress = '0x553a463f365c74EdA00B7E5aaF080B066d4CA03C';

      const document: RentalCheckerDocument = {
        id: '0',
        tokenId: '2275',
        sellerAddress,
        sellerAddressMasked: sellerAddress.substring(sellerAddress.length - 6),
        sellerIsOwner: true,
        lockExpiration: 1642250309,
        estimatedCostTotal: 0.6,
        ethCost: 0.4,
        gasCost: 0.2,
      };

      return <Context>{
        ...context,
        documents: [document],
      };
    });
  }

  private emitDocuments() {
    return Rx.tap((context: Context) => {
      const addLayers = [
        {
          id: RENTAL_CHECKER_DOCUMENT,
          collectionName: RENTAL_CHECKER_DOCUMENT,
          set: context.documents,
        },
      ];
      this.eventService.addLayers(context.clientId, addLayers);
    });
  }
}

interface Context extends BaseContext {
  readonly documents?: RentalCheckerDocument[];
}
