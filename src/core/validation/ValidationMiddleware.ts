import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '@/core/errors/AppError';

/**
 * Validates request body against a Zod schema
 */
export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error: any) {
      const errors = error.issues?.map((e: any) => `${e.path.join('.')}: ${e.message}`) || [];
      throw new AppError(400, 'Validation failed', errors);
    }
  };
};

/**
 * Validates query parameters against a Zod schema
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated as any;
      next();
    } catch (error: any) {
      const errors = error.issues?.map((e: any) => `${e.path.join('.')}: ${e.message}`) || [];
      throw new AppError(400, 'Query validation failed', errors);
    }
  };
};

/**
 * Validates path parameters against a Zod schema
 */
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.params);
      req.params = validated as any;
      next();
    } catch (error: any) {
      const errors = error.issues?.map((e: any) => `${e.path.join('.')}: ${e.message}`) || [];
      throw new AppError(400, 'Parameter validation failed', errors);
    }
  };
};
