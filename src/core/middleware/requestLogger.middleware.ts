import { Request, Response, NextFunction } from 'express';
import { Logger } from '../logging/Logger';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random()}`;

  req.id = requestId as string;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    };

    if (res.statusCode >= 400) {
      Logger.warn(`Request failed`, log);
    } else {
      Logger.info(`Request completed`, log);
    }
  });

  next();
}
