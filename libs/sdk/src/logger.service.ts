import winston from 'winston';
import { LoggerService, LogLevel } from '@nestjs/common';

export class WinstonLoggerService implements LoggerService {
  private logger: winston.Logger;

  constructor(options: winston.LoggerOptions) {
    this.logger = winston.createLogger(options);
  }
  log(message: any, ...optionalParams: any[]) {
    this.logger.info(message, ...optionalParams);
  }
  error(message: any, ...optionalParams: any[]) {
    this.logger.error(message, ...optionalParams);
  }
  warn(message: any, ...optionalParams: any[]) {
    this.logger.warn(message, ...optionalParams);
  }
  debug?(message: any, ...optionalParams: any[]) {
    this.logger.debug(message, ...optionalParams);
  }
  verbose?(message: any, ...optionalParams: any[]) {
    this.logger.verbose(message, ...optionalParams);
  }
  setLogLevels?(levels: LogLevel[]) {
    // Not sure what to do about this one
  }
}
