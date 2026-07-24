import { PaginationMeta } from '@/core/response/ResponseHandler';

export interface PaginationParams {
  page?: number | string;
  limit?: number | string;
  sort?: string;
  search?: string;
}

export interface PaginationQuery {
  page: number;
  limit: number;
  skip: number;
  sort?: Record<string, 1 | -1>;
}

export class PaginationHelper {
  static DEFAULT_PAGE = 1;
  static DEFAULT_LIMIT = 20;
  static MAX_LIMIT = 100;

  static parse(params: PaginationParams): PaginationQuery {
    let page = parseInt(String(params.page || this.DEFAULT_PAGE), 10);
    let limit = parseInt(String(params.limit || this.DEFAULT_LIMIT), 10);

    // Validation
    if (page < 1) page = this.DEFAULT_PAGE;
    if (limit < 1) limit = this.DEFAULT_LIMIT;
    if (limit > this.MAX_LIMIT) limit = this.MAX_LIMIT;

    const skip = (page - 1) * limit;

    let sort: Record<string, 1 | -1> | undefined;
    if (params.sort) {
      const sortParts = params.sort.split(':');
      const field = sortParts[0];
      const order = sortParts[1]?.toLowerCase() === 'desc' ? -1 : 1;
      sort = { [field]: order };
    }

    return { page, limit, skip, sort };
  }

  static createMeta(page: number, limit: number, totalItems: number): PaginationMeta {
    const totalPages = Math.ceil(totalItems / limit);
    return {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }
}
