import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
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

  // Malformed ObjectId in a route param (e.g. GET /lessons/not-an-id) throws
  // this from Mongoose before any controller/service code runs -- without
  // this branch it fell through to the generic 500 below instead of a 400.
  if (error instanceof mongoose.Error.CastError) {
    ResponseHandler.badRequest(res, `Invalid ${error.path}: ${error.value}`);
    return;
  }

  // Missing/invalid required fields on a raw .save()/.create() (as opposed
  // to Zod-validated request bodies) throws this -- surface Mongoose's own
  // field-level messages instead of a generic 500.
  if (error instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(error.errors).map((err) => err.message);
    ResponseHandler.badRequest(res, 'Validation failed', errors);
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
