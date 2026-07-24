import { Request, Response, NextFunction } from 'express';
import { plainToClass } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { ResponseStandardizer } from '../response/ResponseStandardizer';

function formatValidationErrors(errors: ValidationError[]) {
  return errors.map(error => ({
    field: error.property,
    message: Object.values(error.constraints || {}).join(', '),
    value: error.value,
  }));
}

export function validateDto(dtoClass: any) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const instance = plainToClass(dtoClass, req.body);
      const errors = await validate(instance, { skipMissingProperties: false });

      if (errors.length > 0) {
        const formattedErrors = formatValidationErrors(errors);
        return ResponseStandardizer.error(res, {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          errors: formattedErrors,
          statusCode: 400,
        });
      }

      req.body = instance;
      next();
    } catch (error: any) {
      ResponseStandardizer.error(res, {
        code: 'DTO_PROCESSING_ERROR',
        message: 'Failed to process request',
        statusCode: 400,
      });
    }
  };
}
