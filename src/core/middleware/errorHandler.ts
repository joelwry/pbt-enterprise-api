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
// Expected client-side outcomes -- a logged-out visitor's silent refresh
// attempt (401, every page load), a validation typo -- happened on every
// request that hit any of the branches below and were logged at `error`
// level with a full stack trace regardless. That drowned real failures in
// noise. Only genuinely unexpected/server-side failures (5xx, or an error
// type nothing here recognizes) get the loud treatment now.
function logExpected(message: string, req: Request): void {
  logger.debug(message, { url: req.url, method: req.method });
}

function logUnexpected(message: string, error: Error, req: Request): void {
  logger.error(message, { url: req.url, method: req.method, ip: req.ip, stack: error.stack });
}

export const errorHandler = (
  error: Error | AppError | ZodError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const errors = error.issues.map(
      (err) => `${err.path.join('.')}: ${err.message}`
    );
    logExpected(`Validation failed: ${error.message}`, req);
    ResponseHandler.badRequest(res, 'Validation failed', errors);
    return;
  }

  // Handle custom app errors
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logUnexpected(`Error occurred: ${error.message}`, error, req);
    } else {
      logExpected(`Error occurred: ${error.message}`, req);
    }
    ResponseHandler.error(res, error.statusCode, error.message, error.errors);
    return;
  }

  // Malformed ObjectId in a route param (e.g. GET /lessons/not-an-id) throws
  // this from Mongoose before any controller/service code runs -- without
  // this branch it fell through to the generic 500 below instead of a 400.
  if (error instanceof mongoose.Error.CastError) {
    logExpected(`Invalid ${error.path}: ${error.value}`, req);
    ResponseHandler.badRequest(res, `Invalid ${error.path}: ${error.value}`);
    return;
  }

  // Missing/invalid required fields on a raw .save()/.create() (as opposed
  // to Zod-validated request bodies) throws this -- surface Mongoose's own
  // field-level messages instead of a generic 500.
  if (error instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(error.errors).map((err) => err.message);
    logExpected(`Validation failed: ${error.message}`, req);
    ResponseHandler.badRequest(res, 'Validation failed', errors);
    return;
  }

  // Handle unknown errors
  logUnexpected('Unknown error', error, req);
  ResponseHandler.internalServerError(res, 'An unexpected error occurred');
};

/**
 * 404 Not Found middleware
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`);
  next(error);
};
