import { EkpLogger } from '@app/sdk';
import { NestFactory } from '@nestjs/core';
import { PortfolioModule } from './portfolio.module';
import * as dotenv from 'dotenv';
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(PortfolioModule);
  app.useLogger(new EkpLogger());
  await app.listen(process.env.PORT || 3001);
}
bootstrap();
