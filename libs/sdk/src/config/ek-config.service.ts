import {
  BullModuleOptions,
  SharedBullConfigurationFactory,
} from '@nestjs/bull';
import {
  CacheModuleOptions,
  CacheOptionsFactory,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MongooseModuleOptions,
  MongooseOptionsFactory,
} from '@nestjs/mongoose';
import * as redisStore from 'cache-manager-redis-store';
import { RedisModuleAsyncOptions } from 'nestjs-redis';

export const PUBLISH_CLIENT = 'PUBLISH_CLIENT';
export const SUBSCRIBE_CLIENT = 'SUBSCRIBER_CLIENT';

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
    this.mongoPassword = this.optional('MONGO_PASSWORD', undefined);
    this.redisPassword = this.optional('REDIS_PASSWORD', undefined);
  }

  readonly pluginId: string;
  readonly pluginName: string;
  readonly moralisServerUrl: string;
  readonly moralisAppId: string;
  readonly moralisApiKey: string;
  readonly mongoHost: string;
  readonly mongoPort: number;
  readonly mongoPassword: string;
  readonly redisHost: string;
  readonly redisPort: number;
  readonly redisPassword: string;

  static createRedisAsyncOptions(): RedisModuleAsyncOptions {
    return {
      useFactory: (configService: EkConfigService) => {
        return [
          {
            name: PUBLISH_CLIENT,
            host: configService.redisHost,
            port: configService.redisPort,
            password: configService.redisPassword,
          },
          {
            name: SUBSCRIBE_CLIENT,
            host: configService.redisHost,
            port: configService.redisPort,
            password: configService.redisPassword,
          },
        ];
      },
      inject: [EkConfigService],
    };
  }
  createCacheOptions(): CacheModuleOptions {
    return {
      isGlobal: true,
      store: redisStore,
      host: this.redisHost,
      port: this.redisPort,
      password: this.redisPassword,
      ttl: 0,
    };
  }

  createMongooseOptions(): MongooseModuleOptions {
    return {
      uri: `mongodb://${this.mongoHost}:${this.mongoPort}/ekp`,
      pass: this.mongoPassword,
    };
  }

  createSharedConfiguration(): BullModuleOptions {
    return {
      redis: {
        host: this.redisHost,
        port: this.redisPort,
        password: this.redisPassword,
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
