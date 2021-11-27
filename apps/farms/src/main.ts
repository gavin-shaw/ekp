import { NestFactory } from '@nestjs/core';
import winston from 'winston';
import { FarmsModule } from './farms.module';

async function bootstrap() {
  const app = await NestFactory.create(FarmsModule, {
    logger: winston.createLogger(),
  });
  await app.listen(process.env.PORT || 3001);
}

bootstrap();
