import { Injectable } from '@nestjs/common';
import Bottleneck from 'bottleneck';
import { EkConfigService } from './config/ek-config.service';

@Injectable()
export class LimiterService {
  constructor(private configService: EkConfigService) {}

  createLimiter(id: string, reqsPerSecond: number) {
    return new Bottleneck({
      maxConcurrent: reqsPerSecond,
      reservoir: reqsPerSecond,
      reservoirRefreshAmount: reqsPerSecond,
      reservoirRefreshInterval: 1000,
      id,
      datastore: 'redis',
      clientOptions: {
        host: this.configService.redisHost,
        port: this.configService.redisPort,
      },
    });
  }
}
