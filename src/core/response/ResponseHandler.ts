import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export class ResponseHandler {
  static success<T>(res: Response, statusCode: number, message: string, data?: T): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
    };
    return res.status(statusCode).json(response);
  }

  static paginated<T>(
    res: Response,
    statusCode: number,
    message: string,
    data: T[],
    pagination: PaginationMeta
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data: data as any,
      pagination,
    };
    return res.status(statusCode).json(response);
  }

  static error(
    res: Response,
    statusCode: number,
    message: string,
    errors: string[] = []
  ): Response {
    const response: ApiResponse = {
      success: false,
      message,
      errors: errors.length > 0 ? errors : [message],
    };
    return res.status(statusCode).json(response);
  }

  static created<T>(res: Response, message: string, data: T): Response {
    return this.success(res, 201, message, data);
  }

  static ok<T>(res: Response, message: string, data: T): Response {
    return this.success(res, 200, message, data);
  }

  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  static badRequest(res: Response, message: string, errors?: string[]): Response {
    return this.error(res, 400, message, errors);
  }

  static unauthorized(res: Response, message: string = 'Unauthorized'): Response {
    return this.error(res, 401, message);
  }

  static forbidden(res: Response, message: string = 'Forbidden'): Response {
    return this.error(res, 403, message);
  }

  static notFound(res: Response, message: string = 'Not found'): Response {
    return this.error(res, 404, message);
  }

  static conflict(res: Response, message: string = 'Conflict'): Response {
    return this.error(res, 409, message);
  }

  static internalServerError(res: Response, message: string = 'Internal server error'): Response {
    return this.error(res, 500, message);
  }
}
