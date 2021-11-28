import { Logger, Module } from '@nestjs/common';
import { EkpLogger } from './ekp.logger';

const loggerProvider = { provide: Logger, useClass: EkpLogger };

@Module({
  providers: [loggerProvider],
  exports: [loggerProvider],
})
export class LoggerModule {}
