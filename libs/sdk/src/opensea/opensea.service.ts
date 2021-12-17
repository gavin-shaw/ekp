import { Injectable } from '@nestjs/common';
import retry from 'async-retry';
import axios from 'axios';
import Bottleneck from 'bottleneck';
import { validate } from 'bycontract';
import { cacheable } from '../cacheable.decorator';
import { logger } from '../utils';

const BASE_URL = 'https://api.opensea.io/api/v1';

const limiter = new Bottleneck({
  maxConcurrent: 2,
  reservoir: 2,
  reservoirRefreshAmount: 2,
  reservoirRefreshInterval: 1000,
});

@Injectable()
export class OpenseaService {
  @cacheable(0)
  async metadataOf(contractAddress: string) {
    validate([contractAddress], ['string']);
    const url = `${BASE_URL}/asset_contract/${contractAddress}`;

    return retry(
      async () =>
        await limiter.schedule(async () => {
          logger.debug(`GET ${url}`);

          const contractResult = await axios.get(url);

          return contractResult.data?.collection;
        }),
      {
        onRetry: (error) => {
          logger.warn(`Retrying ${url}: ${error.message}`);
        },
      },
    );
  }

  @cacheable(3600)
  async floorPriceOf(slug: string): Promise<number> {
    validate([slug], ['string']);
    const url = `${BASE_URL}/collection/${slug}/stats`;

    return retry(
      async () =>
        await limiter.schedule(async () => {
          logger.debug(`GET ${url}`);

          const statsResult = await axios.get(url);

          return statsResult.data?.stats?.floor_price;
        }),
      {
        onRetry: (error) => {
          logger.warn(`Retrying ${url}: ${error.message}`);
        },
      },
    );
  }
}
