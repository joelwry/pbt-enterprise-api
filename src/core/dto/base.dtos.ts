import { IsOptional, Type, Min, Max, IsString, IsIn } from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC' = 'DESC';
}

export class ResponseMeta {
  timestamp: string;
  version: string;
  path: string;
  method: string;
}

export class ValidationErrorDto {
  field: string;
  message: string;
  value?: any;
}

export class BaseResponseDto<T = any> {
  success: boolean;
  code: string;
  message: string;
  data?: T;
  meta: ResponseMeta;
  pagination?: PaginationMeta;
  errors?: ValidationErrorDto[];
}

export class PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
