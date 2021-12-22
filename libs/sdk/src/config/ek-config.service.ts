import {
  BullModuleOptions,
  SharedBullConfigurationFactory,
} from '@nestjs/bull';
import {
  CacheModuleOptions,
  CacheOptionsFactory,
  Injectable,
  Provider,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import {
  MongooseModuleOptions,
  MongooseOptionsFactory,
} from '@nestjs/mongoose';
import * as redisStore from 'cache-manager-redis-store';

export const CLIENT_PROXY = 'CLIENT_PROXY';

@Injectable()
export class EkConfigService
  implements
    CacheOptionsFactory,
    MongooseOptionsFactory,
    SharedBullConfigurationFactory
{
  constructor(private configService: ConfigService) {
    this.pluginId = this.required('EKP_PLUGIN_ID');
    this.pluginName = this.required('EKP_PLUGIN_NAME');
    this.moralisServerUrl = this.required('MORALIS_SERVER_URL');
    this.moralisAppId = this.required('MORALIS_APP_ID');
    this.moralisApiKey = this.required('MORALIS_API_KEY');
    this.mongoHost = this.required('MONGO_HOST');
    this.redisHost = this.required('REDIS_HOST');
    this.mongoPort = this.optional('MONGO_PORT', 27017);
    this.redisPort = this.optional('REDIS_PORT', 6379);
  }

  readonly pluginId: string;
  readonly pluginName: string;
  readonly moralisServerUrl: string;
  readonly moralisAppId: string;
  readonly moralisApiKey: string;
  readonly mongoHost: string;
  readonly mongoPort: number;
  readonly redisHost: string;
  readonly redisPort: number;

  static createClientProxyProvider(): Provider {
    return {
      provide: CLIENT_PROXY,
      inject: [EkConfigService],
      useFactory: (configService: EkConfigService) => {
        return ClientProxyFactory.create({
          transport: Transport.REDIS,
          options: {
            url: `redis://${configService.redisHost}:${configService.redisPort}`,
          },
        });
      },
    };
  }

  createMicroserviceOptions() {
    return {
      transport: Transport.REDIS,
      options: {
        url: `redis://${this.redisHost}:${this.redisPort}`,
      },
    };
  }

  createCacheOptions(): CacheModuleOptions {
    return {
      isGlobal: true,
      store: redisStore,
      host: this.redisHost,
      port: this.redisPort,
      ttl: 0,
    };
  }

  createMongooseOptions(): MongooseModuleOptions {
    return {
      uri: `mongodb://${this.mongoHost}:${this.mongoPort}/ekp`,
    };
  }

  createSharedConfiguration(): BullModuleOptions {
    return {
      redis: {
        host: this.redisHost,
        port: this.redisPort,
      },
    };
  }

  private required<T>(name: string): T {
    const value = this.configService.get(name);
    if (value === undefined || value === null) {
      throw new Error(`Environment variable ${name} is required and missing`);
    }
    return value;
  }

  private optional<T>(name: string, defaultValue: T): T {
    const value = this.configService.get(name);
    if (value === undefined || value === null) {
      return defaultValue;
    }
    return value;
  }
}
