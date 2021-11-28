import { NestFactory } from '@nestjs/core';
import winston from 'winston';
import { FarmsModule } from './farms.module';
import * as dotenv from 'dotenv';
import { WinstonLoggerService } from '../../../libs/sdk/src/logger.service';
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(FarmsModule, {
    logger: new WinstonLoggerService({
      level: 'debug',
      format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.prettyPrint(),
      ),
      transports: [
        new winston.transports.Console({ format: winston.format.simple() }),
      ],
    }),
  });
  await app.listen(process.env.PORT || 3001);
}

bootstrap();
