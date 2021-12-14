import { DefaultLogger } from '@app/sdk';
import { NestFactory } from '@nestjs/core';
import { PortfolioModule } from './portfolio.module';
import * as dotenv from 'dotenv';
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(PortfolioModule);
  app.useLogger(new DefaultLogger());
  await app.listen(process.env.PORT || 3001);
}
bootstrap();
