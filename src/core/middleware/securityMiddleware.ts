import { Request, Response, NextFunction } from 'express';
import rateLimit, { RateLimitInfo, ipKeyGenerator } from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import logger from '@/core/logger/logger';
import { config } from '@/config/environment';

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
      // Use user ID if authenticated, otherwise use a normalized IP
      const ip = ipKeyGenerator(req as any);
      return (req as any).user?.id || ip || 'unknown';
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
 * Brute-force protection for credential endpoints.
 *
 * Attach it to specific routes (see setupSecurityMiddleware) rather than a
 * whole prefix: inside an `app.use('/prefix', ...)` mount Express strips the
 * prefix from `req.path`, and routes like /me and /refresh-token fire on every
 * page load, so a blanket limiter would lock out ordinary use.
 */
export interface AuthRateLimiterOptions {
  windowMs?: number;
  maxAttempts?: number;
  /**
   * true: only failed responses (status >= 400) count toward the limit, so a
   * member who types the right password never burns an attempt.
   * false: every request counts (use for endpoints that always answer 200,
   * e.g. forgot-password, where counting is what stops email flooding).
   */
  skipSuccessfulRequests?: boolean;
  /** Key on the client IP alone (for endpoints with no email in the body). */
  keyByIpOnly?: boolean;
}

export const createAuthRateLimiter = ({
  windowMs = 300000, // 5 minutes
  maxAttempts = 5,
  skipSuccessfulRequests = true,
  keyByIpOnly = false,
}: AuthRateLimiterOptions = {}) => {
  const minutes = Math.max(1, Math.ceil(windowMs / 60000));

  return rateLimit({
    windowMs,
    max: maxAttempts,
    message: 'Too many attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    keyGenerator: (req: Request) => {
      // ipKeyGenerator takes the IP *string* (it also folds IPv6 to its /56 subnet).
      const ip = ipKeyGenerator(req.ip ?? '');
      if (keyByIpOnly) return ip;
      // Rate limit by email and normalized IP combination. The email is
      // lower-cased so "A@x.com" and "a@x.com" can't be rotated to dodge the
      // counter, and non-string values (e.g. an injected object) collapse to ''.
      const raw = req.body?.email;
      const email = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
      return `${email}:${ip}`;
    },
    handler: (req: Request, res: Response) => {
      logger.warn('Authentication rate limit exceeded', {
        correlationId: req.id,
        path: req.originalUrl,
        email: typeof req.body?.email === 'string' ? req.body.email : undefined,
        ip: req.ip,
      });

      res.status(429).json({
        success: false,
        message: `Too many attempts. Please try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
        retryAfter: req.rateLimit?.resetTime,
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

  // Brute-force limiters on the credential endpoints only. app.post() matches
  // the exact route, so /me, /refresh-token and /reset-password/validate (hit
  // on every page load) are never counted.
  const authBase = `/api/${config.API_VERSION}/auth`;

  // Sign-in: only wrong-credential responses count, per email + IP.
  const loginLimiter = createAuthRateLimiter({ windowMs: 5 * 60 * 1000, maxAttempts: 5 });
  app.post(`${authBase}/login`, loginLimiter);
  app.post(`${authBase}/admin/login`, loginLimiter);

  // Forgot-password always answers 200 (to avoid revealing which emails exist),
  // so every request counts -- this is what stops someone flooding an inbox.
  app.post(
    `${authBase}/forgot-password`,
    createAuthRateLimiter({ windowMs: 15 * 60 * 1000, maxAttempts: 5, skipSuccessfulRequests: false })
  );

  // Reset/setup token submission: stops guessing tokens. The body has no email.
  app.post(
    `${authBase}/reset-password`,
    createAuthRateLimiter({ windowMs: 15 * 60 * 1000, maxAttempts: 10, keyByIpOnly: true })
  );

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
