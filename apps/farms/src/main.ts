import { EkpLogger } from '@app/sdk';
import { NestFactory } from '@nestjs/core';
import * as dotenv from 'dotenv';
import { FarmsModule } from './farms.module';
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(FarmsModule);
  app.useLogger(new EkpLogger());
  await app.listen(process.env.PORT || 3001);
}

bootstrap();
