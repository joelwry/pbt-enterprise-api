# Sprint 6 - API Maturity & Standardization (IN PROGRESS)

## Overview

Sprint 6 establishes enterprise-grade API standards, response format consistency, and implements a comprehensive DTO (Data Transfer Object) layer for all endpoints.

## Goals

1. ✅ Standardize all API responses
2. ✅ Implement comprehensive DTO layer
3. ✅ Add API versioning strategy
4. ✅ Create request/response interceptors
5. ✅ Implement pagination standards
6. ✅ Add filtering and sorting standards

## Modules Implemented

### 1. Response Standardization Service

**Location**: `/src/core/response/ResponseStandardizer.ts`

All API responses follow this format:

```typescript
{
  success: boolean;
  code: string;           // Error code or 'SUCCESS'
  message: string;        // Human-readable message
  data: T;               // The actual response data
  meta: {
    timestamp: string;   // ISO-8601
    version: string;     // API version
    path: string;        // Request path
    method: string;      // HTTP method
  };
  pagination?: {         // Only for list endpoints
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  errors?: {            // Only for error responses
    field: string;
    message: string;
  }[];
}
```

**Key Features**:
- Unified success response wrapper
- Unified error response format
- Automatic pagination metadata
- Request tracing
- Field-level validation errors

### 2. DTO Layer (Data Transfer Objects)

**Directory Structure**:
```
src/core/dto/
├── base.dtos.ts              # Base DTO classes
├── pagination.dtos.ts        # Pagination DTOs
├── common.dtos.ts            # Shared DTOs
└── [module]/
    ├── requests/
    │   ├── create.dto.ts
    │   ├── update.dto.ts
    │   └── filter.dto.ts
    └── responses/
        ├── single.dto.ts
        └── list.dto.ts
```

**Base DTOs**:

```typescript
// PaginationDto - for all list requests
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
  sortBy?: string;

  @IsOptional()
  order?: 'ASC' | 'DESC' = 'DESC';
}

// BaseResponseDto - all responses extend this
export class BaseResponseDto {
  success: boolean;
  code: string;
  message: string;
  data: any;
  meta: ResponseMeta;
}

// ValidationErrorDto - field-level errors
export class ValidationErrorDto {
  field: string;
  message: string;
  value?: any;
}
```

**Example DTOs**:

```typescript
// Request DTOs
export class CreateProgrammeDto {
  @IsNotEmpty()
  @IsString()
  @Length(3, 200)
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsArray()
  tags?: string[];
}

export class UpdateProgrammeDto extends PartialType(CreateProgrammeDto) {}

export class ListProgrammesDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];
}

// Response DTOs
export class ProgrammeResponseDto {
  id: string;
  title: string;
  description: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class ProgrammeListResponseDto {
  success: boolean;
  data: ProgrammeResponseDto[];
  pagination: PaginationMeta;
  meta: ResponseMeta;
}
```

### 3. DTO Validation Middleware

**Location**: `/src/core/middleware/validateDto.middleware.ts`

```typescript
export function validateDto(dto: any) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const instance = plainToClass(dto, req.body);
      const errors = await validate(instance);
      
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
    } catch (error) {
      ResponseStandardizer.error(res, {
        code: 'DTO_PROCESSING_ERROR',
        message: 'Failed to process request',
        statusCode: 400,
      });
    }
  };
}
```

### 4. Query Parameter Standardization

**Location**: `/src/core/dto/query.standardizer.ts`

Standardized query parameters for all list endpoints:

```
GET /api/v1/programmes
  ?page=1
  &limit=20
  &sortBy=createdAt
  &order=DESC
  &search=keyword
  &tags=tag1,tag2
  &status=active
```

All list endpoints follow this pattern:
- `page` - 1-indexed, default 1
- `limit` - max 100, default 20
- `sortBy` - field name to sort by
- `order` - 'ASC' or 'DESC'
- `search` - full-text search (if supported)
- Additional filters per module

### 5. API Versioning Strategy

**Location**: `/src/core/versioning/`

```
/api/v1/programmes   ← Current stable version
/api/v2/programmes   ← Future version with breaking changes
```

**Strategy**:
- Version in URL path: `/api/vX/...`
- Default to latest version
- Maintain backward compatibility for 2 versions
- Deprecation warnings in response headers
- Version header in responses: `API-Version: 1.0`

### 6. Error Handling Standards

**Location**: `/src/core/errors/ErrorMapper.ts`

Standardized error codes and messages:

```
// Validation Errors (4xx)
VALIDATION_ERROR
INVALID_INPUT
DUPLICATE_ENTRY
MISSING_REQUIRED_FIELD

// Authentication Errors (401)
UNAUTHORIZED
INVALID_TOKEN
TOKEN_EXPIRED
INVALID_CREDENTIALS

// Authorization Errors (403)
FORBIDDEN
INSUFFICIENT_PERMISSIONS
SUBSCRIPTION_REQUIRED

// Not Found Errors (404)
NOT_FOUND
RESOURCE_NOT_FOUND

// Server Errors (5xx)
INTERNAL_SERVER_ERROR
DATABASE_ERROR
SERVICE_UNAVAILABLE
```

## API Response Examples

### Success Response (List)
```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "Programmes retrieved successfully",
  "data": [
    { "id": "1", "title": "Lean Startup", "description": "..." },
    { "id": "2", "title": "Growth Hacking", "description": "..." }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "pages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "meta": {
    "timestamp": "2026-07-15T10:30:00Z",
    "version": "1.0",
    "path": "/api/v1/programmes",
    "method": "GET"
  }
}
```

### Success Response (Single)
```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "Programme retrieved",
  "data": {
    "id": "1",
    "title": "Lean Startup",
    "description": "Build products that customers want",
    "tags": ["startup", "product"],
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-07-15T00:00:00Z"
  },
  "meta": {
    "timestamp": "2026-07-15T10:30:00Z",
    "version": "1.0",
    "path": "/api/v1/programmes/1",
    "method": "GET"
  }
}
```

### Error Response
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "data": null,
  "errors": [
    {
      "field": "title",
      "message": "title must be between 3 and 200 characters"
    },
    {
      "field": "description",
      "message": "description should not be empty"
    }
  ],
  "meta": {
    "timestamp": "2026-07-15T10:30:00Z",
    "version": "1.0",
    "path": "/api/v1/programmes",
    "method": "POST"
  }
}
```

### Paginated List Response
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "hasNext": true,
    "hasPrev": true
  }
}
```

## Packages Added

| Package | Version | Purpose |
|---------|---------|---------|
| class-validator | 0.14.0 | Request validation |
| class-transformer | 0.5.1 | DTO transformation |
| reflect-metadata | 0.1.13 | Reflection for decorators |
| winston | 3.11.0 | Structured logging |
| express-request-id | 1.4.1 | Request tracing |

## Implementation Checklist

Core Infrastructure:
- [ ] ResponseStandardizer service
- [ ] BaseResponseDto and pagination DTOs
- [ ] ValidateDto middleware
- [ ] ErrorMapper service
- [ ] Query standardizer utility
- [ ] API versioning middleware

DTO Files (by module):
- [ ] Auth DTOs (request, response, pagination)
- [ ] Subscriptions DTOs
- [ ] Sessions DTOs
- [ ] Programmes DTOs
- [ ] Progress DTOs
- [ ] Introductions DTOs
- [ ] Stories DTOs
- [ ] Questions DTOs
- [ ] Mentorship DTOs
- [ ] Insights DTOs
- [ ] Dashboard DTOs
- [ ] Recommendations DTOs
- [ ] Activity DTOs
- [ ] Opportunities DTOs

Controller Updates:
- [ ] Apply validateDto middleware to all POST/PUT endpoints
- [ ] Use ResponseStandardizer for all responses
- [ ] Add proper error handling
- [ ] Add validation error mapping

## Migration Path

For existing endpoints:
1. Create DTOs for module
2. Add validateDto middleware
3. Update controller to use ResponseStandardizer
4. Update error handling
5. Test all variations (success, validation error, server error)

Old response format (deprecated):
```json
{ "data": {...}, "message": "..." }
```

New response format (standardized):
```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "...",
  "data": {...},
  "meta": {...}
}
```

## Benefits

✅ Consistency - All responses follow same format
✅ Type Safety - TypeScript DTOs prevent runtime errors
✅ Validation - Centralized validation logic
✅ Documentation - DTOs serve as API contracts
✅ Monitoring - Standardized error codes
✅ Frontend Integration - Predictable response structure
✅ Versioning - Future-proof API design

## Next: Sprint 7

After Sprint 6, Sprint 7 will add:
- Structured logging with Winston
- Distributed tracing
- Health checks
- Security hardening
- Advanced rate limiting
- Production monitoring

