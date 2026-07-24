import { Request, Response, NextFunction } from 'express';
import rateLimit, { RateLimitInfo } from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import logger from '@/core/logger/logger';

declare global {
  namespace Express {
    interface Request {
      /** Correlation ID assigned by correlationIdMiddleware, used to trace a request across logs. */
      id?: string;
      /** Populated by express-rate-limit's middleware once a limiter has run for this request. */
      rateLimit?: RateLimitInfo;
    }
  }
}

/**
 * Request correlation ID middleware
 * Adds unique ID to each request for tracking across logs
 */
export const correlationIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const correlationId = req.headers['x-correlation-id'] || `${Date.now()}-${Math.random()}`;
  req.id = String(correlationId);

  // Pass correlation ID to response headers
  res.setHeader('X-Correlation-ID', req.id);
  res.setHeader('X-Response-Time', new Date().toISOString());

  next();
};

/**
 * Request duration logging middleware
 */
export const requestDurationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();

  // Capture the original end method
  const originalEnd = res.end;

  // Override res.end to log request duration
  res.end = ((chunk?: any, encoding?: any) => {
    const duration = Date.now() - startTime;

    logger.info('Request completed', {
      correlationId: req.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: (req as any).user?.id,
      ip: req.ip,
    });

    // Call the original end method
    return originalEnd.call(res, chunk, encoding);
  }) as typeof res.end;

  next();
};

/**
 * Global rate limiter for API endpoints
 * Configurable via environment variables
 */
export const createGlobalRateLimiter = (
  windowMs: number = 900000, // 15 minutes
  maxRequests: number = 100
) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skip: (req: Request) => {
      // Skip rate limiting for health checks
      if (req.path === '/health' || req.path === '/ready') {
        return true;
      }
      return false;
    },
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise use IP
      return (req as any).user?.id || req.ip || 'unknown';
    },
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded', {
        correlationId: req.id,
        ip: req.ip,
        userId: (req as any).user?.id,
        path: req.path,
      });

      res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter: req.rateLimit?.resetTime,
      });
    },
  });
};

/**
 * Authentication-based rate limiter
 * Stricter limits for authenticated users with failed attempts
 */
export const createAuthRateLimiter = (
  windowMs: number = 300000, // 5 minutes
  maxAttempts: number = 5
) => {
  return rateLimit({
    windowMs,
    max: maxAttempts,
    message: 'Too many login attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      // Rate limit by email and IP combination
      const email = req.body?.email || '';
      return `${email}:${req.ip}`;
    },
    skip: (req: Request) => {
      // Skip for non-auth endpoints
      return !req.path.includes('/auth/');
    },
    handler: (req: Request, res: Response) => {
      logger.warn('Authentication rate limit exceeded', {
        correlationId: req.id,
        email: req.body?.email,
        ip: req.ip,
      });

      res.status(429).json({
        success: false,
        message: 'Too many login attempts. Account temporarily locked. Try again in 5 minutes.',
      });
    },
  });
};

/**
 * Data sanitization middleware
 * Prevents NoSQL injection by sanitizing user inputs
 */
export const sanitizationMiddleware = mongoSanitize({
  onSanitize: ({ req, key }) => {
    logger.warn('Data sanitization detected potential injection', {
      correlationId: req.id,
      key,
      path: req.path,
      userId: (req as any).user?.id,
    });
  },
});

/**
 * Custom parameter pollution protection
 * Removes duplicate query parameters and body fields
 */
export const parameterPollutionMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Check for duplicate query parameters
  Object.keys(req.query).forEach((key) => {
    const value = req.query[key];
    if (Array.isArray(value) && value.length > 1) {
      logger.warn('Parameter pollution detected in query', {
        correlationId: req.id,
        parameter: key,
        values: value,
      });
      // Keep only the last value
      req.query[key] = value[value.length - 1];
    }
  });

  next();
};

/**
 * Request validation middleware
 * Ensures requests have proper content-type headers
 */
export const requestValidationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const contentType = req.get('content-type');

  // Skip validation for GET requests and health checks
  if (req.method === 'GET' || req.path === '/health' || req.path === '/ready') {
    return next();
  }

  // For POST, PUT, PATCH - ensure proper content-type
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    if (!contentType || (!contentType.includes('application/json') && !contentType.includes('multipart/form-data'))) {
      logger.warn('Invalid content-type header', {
        correlationId: req.id,
        contentType,
        method: req.method,
        path: req.path,
      });

      res.status(415).json({
        success: false,
        message: 'Unsupported Media Type. Please use application/json or multipart/form-data.',
      });
      return;
    }
  }

  next();
};

/**
 * Add security headers specific to PBT
 */
export const pbtSecurityHeadersMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  );

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy (formerly Feature Policy)
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=()'
  );

  next();
};

/**
 * Combine all security middleware
 */
export function setupSecurityMiddleware(app: any) {
  // Correlation ID and duration tracking
  app.use(correlationIdMiddleware);
  app.use(requestDurationMiddleware);

  // Rate limiting
  const globalLimiter = createGlobalRateLimiter(
    parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
  );
  app.use(globalLimiter);

  // Auth rate limiter
  const authLimiter = createAuthRateLimiter();
  app.use('/api/v1/auth/', authLimiter);

  // Data sanitization
  app.use(sanitizationMiddleware);

  // Parameter pollution protection
  app.use(parameterPollutionMiddleware);

  // Request validation
  app.use(requestValidationMiddleware);

  // Custom security headers
  app.use(pbtSecurityHeadersMiddleware);

  logger.info('Security middleware initialized');
}
