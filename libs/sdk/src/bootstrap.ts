import { NestFactory } from '@nestjs/core';
import { EkConfigService } from '.';
import { DefaultLogger } from './utils';
import { GlobalModule } from '@app/sdk';

export async function microserviceBootstrap(module: any) {
  const app = await NestFactory.create(module, {
    logger: new DefaultLogger(),
  });

  const configService: EkConfigService = app.get(EkConfigService);

  app.connectMicroservice(configService.createMicroserviceOptions());

  await app.startAllMicroservices();
}
