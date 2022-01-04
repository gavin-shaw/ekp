import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import retry from 'async-retry';
import axios from 'axios';
import Bottleneck from 'bottleneck';
import { validate } from 'bycontract';
import { Cache } from 'cache-manager';
import { LimiterService } from '../limiter.service';
import { logger } from '../util';
import { AssetContract } from './model';

const BASE_URL = 'https://api.opensea.io/api/v1';

@Injectable()
export class OpenseaService {
  constructor(
    @Inject(CACHE_MANAGER) private cache: Cache,
    limiterService: LimiterService,
  ) {
    this.limiter = limiterService.createLimiter('opensea-limiter', 2);
  }

  limiter: Bottleneck;

  async metadataOf(contractAddress: string): Promise<AssetContract> {
    validate([contractAddress], ['string']);

    const url = `${BASE_URL}/asset_contract/${contractAddress}`;
    const cacheKey = `opensea.metadata['${contractAddress}']`;

    return this.cache.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(`GET ${url}`);

            const contractResult = await axios.get(url);

            return contractResult.data?.collection;
          }),
          {
            onRetry: (error) => {
              logger.warn(`Retrying ${url}: ${error.message}`);
            },
          },
        ),
      { ttl: 3600000 },
    );
  }

  async floorPriceOf(slug: string): Promise<number> {
    validate([slug], ['string']);

    const url = `${BASE_URL}/collection/${slug}/stats`;
    const cacheKey = `opensea.floorprice['${slug}']`;

    return this.cache.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(`GET ${url}`);

            const statsResult = await axios.get(url);

            return statsResult.data?.stats?.floor_price;
          }),
          {
            onRetry: (error) => {
              logger.warn(`Retrying ${url}: ${error.message}`);
            },
          },
        ),
      { ttl: 60000 },
    );
  }
}
