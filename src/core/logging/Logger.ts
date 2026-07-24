import winston from 'winston';
import path from 'path';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

const transports = [
  new winston.transports.Console(),
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'all.log'),
    maxsize: 5242880,
    maxFiles: 5,
  }),
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'error.log'),
    level: 'error',
    maxsize: 5242880,
    maxFiles: 5,
  }),
];

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: winston.format.json(),
  transports,
});

export class Logger {
  static info(message: string, metadata?: any) {
    logger.info(message, metadata);
  }

  static warn(message: string, metadata?: any) {
    logger.warn(message, metadata);
  }

  static error(message: string, error: Error, metadata?: any) {
    logger.error(message, {
      ...metadata,
      stack: error.stack,
      errorMessage: error.message,
    });
  }

  static debug(message: string, metadata?: any) {
    logger.debug(message, metadata);
  }

  static audit(action: string, userId: string, details: any) {
    logger.info(`[AUDIT] ${action}`, {
      userId,
      action,
      timestamp: new Date().toISOString(),
      ...details,
    });
  }
}

export default logger;
