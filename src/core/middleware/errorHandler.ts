import { Request, Response, NextFunction } from 'express';
import { AppError, InternalServerError } from '@/core/errors/AppError';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import logger from '@/core/logger/logger';
import { ZodError } from 'zod';

/**
 * Global error handling middleware
 * Must be registered AFTER all other middleware and routes
 */
export const errorHandler = (
  error: Error | AppError | ZodError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error(`Error occurred: ${error.message}`, {
    url: req.url,
    method: req.method,
    ip: req.ip,
    stack: error.stack,
  });

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const errors = error.issues.map(
      (err) => `${err.path.join('.')}: ${err.message}`
    );
    ResponseHandler.badRequest(res, 'Validation failed', errors);
    return;
  }

  // Handle custom app errors
  if (error instanceof AppError) {
    ResponseHandler.error(res, error.statusCode, error.message, error.errors);
    return;
  }

  // Handle unknown errors
  logger.error('Unknown error', { error });
  ResponseHandler.internalServerError(res, 'An unexpected error occurred');
};

/**
 * 404 Not Found middleware
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`);
  next(error);
};
