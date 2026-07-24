import { Response } from 'express';

export interface ResponseMeta {
  timestamp: string;
  version: string;
  path: string;
  method: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface StandardizedResponse<T = any> {
  success: boolean;
  code: string;
  message: string;
  data?: T;
  meta: ResponseMeta;
  pagination?: PaginationMeta;
  errors?: Array<{ field: string; message: string; value?: any }>;
}

export class ResponseStandardizer {
  static success<T>(
    res: Response,
    data: T,
    message: string = 'Success',
    statusCode: number = 200,
    pagination?: PaginationMeta,
  ): Response {
    const response: StandardizedResponse<T> = {
      success: true,
      code: 'SUCCESS',
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        path: res.req.path || '',
        method: res.req.method || '',
      },
      ...(pagination && { pagination }),
    };

    return res.status(statusCode).json(response);
  }

  static error(
    res: Response,
    options: {
      code: string;
      message: string;
      statusCode?: number;
      errors?: Array<{ field: string; message: string; value?: any }>;
      data?: any;
    },
  ): Response {
    const { code, message, statusCode = 400, errors, data } = options;

    const response: StandardizedResponse = {
      success: false,
      code,
      message,
      data: data || null,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        path: res.req.path || '',
        method: res.req.method || '',
      },
      ...(errors && { errors }),
    };

    return res.status(statusCode).json(response);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    limit: number,
    message: string = 'Success',
    statusCode: number = 200,
  ): Response {
    const pages = Math.ceil(total / limit);
    const pagination: PaginationMeta = {
      page,
      limit,
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1,
    };

    return this.success(res, data, message, statusCode, pagination);
  }
}
