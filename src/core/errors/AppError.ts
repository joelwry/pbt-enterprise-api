export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public errors: string[] = []
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      message: this.message,
      errors: this.errors.length > 0 ? this.errors : [this.message],
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, errors: string[] = []) {
    super(400, message, errors);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(401, message);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(409, message);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error', errors: string[] = []) {
    super(500, message, errors);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(429, message);
  }
}
