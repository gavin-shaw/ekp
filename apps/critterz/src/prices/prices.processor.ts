import {
  AbstractProcessor,
  BaseContext,
  CoingeckoService,
  EventService,
  MoralisService,
  OpenseaService,
} from '@app/sdk';
import { Processor } from '@nestjs/bull';
import { ethers } from 'ethers';
import * as Rx from 'rxjs';
import { Observable } from 'rxjs';
import { PRICES_DOCUMENT } from '../util/collectionNames';
import { PRICES_QUEUE } from '../util/queue.names';
import { PricesDocument } from './prices.document';

const SCRITTERZ_CONTRACT_ADDRESS = '0x47f75e8dd28df8d6e7c39ccda47026b0dca99043';
const BLOCK_CONTRACT_ADDRESS = '0x807a0774236a0fbe9e7f8e7df49edfed0e6777ea';
const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

@Processor(PRICES_QUEUE)
export class PricesProcessor extends AbstractProcessor<Context> {
  constructor(
    private eventService: EventService,
    private coingeckoService: CoingeckoService,
    private moralisService: MoralisService,
    private openseaService: OpenseaService,
  ) {
    super();
  }

  pipe(source: Observable<BaseContext>): Observable<BaseContext> {
    return source.pipe(this.mapPriceDocuments(), this.emitDocuments());
  }

  private mapPriceDocuments() {
    return Rx.mergeMap(async (context: Context) => {
      const price = await this.moralisService.latestTokenPriceOf(
        'eth',
        BLOCK_CONTRACT_ADDRESS,
      );

      const nativePrices = await this.coingeckoService.nativeCoinPrices(
        context.selectedCurrency.id,
      );

      const ethPrice = nativePrices['eth'];

      const blockPrice = Number(
        ethers.utils.formatEther(price.nativePrice.value),
      );

      const document: PricesDocument = {
        id: '0',
        blockPrice: ethPrice * blockPrice,
        scritterzPrice: undefined,
        fiatSymbol: context.selectedCurrency.symbol,
      };
      return { ...context, documents: [document] };
    });
  }

  private emitDocuments() {
    return Rx.tap((context: Context) => {
      if (context.documents.length === 0) {
        const removeQuery = {
          id: PRICES_DOCUMENT,
        };

        this.eventService.removeLayers(context.clientId, removeQuery);
      } else {
        const addLayers = [
          {
            id: PRICES_DOCUMENT,
            collectionName: PRICES_DOCUMENT,
            set: context.documents,
          },
        ];
        this.eventService.addLayers(context.clientId, addLayers);
      }
    });
  }
}

interface Context extends BaseContext {
  readonly documents?: PricesDocument[];
}
