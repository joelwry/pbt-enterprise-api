import { Request, Response, NextFunction } from 'express';
import { JwtHelper, JwtPayload } from '@/core/auth/JwtHelper';
import { AuthenticationError, AuthorizationError } from '@/core/errors/AppError';
import logger from '@/core/logger/logger';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Authentication middleware - verifies JWT token
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    const payload = JwtHelper.verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    throw new AuthenticationError('Invalid or expired token');
  }
};

/**
 * Authorization middleware - checks user role
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AuthenticationError('User not authenticated');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AuthorizationError('Insufficient permissions');
    }

    next();
  };
};

/**
 * Extract JWT from Authorization header
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Optional authentication - doesn't fail if token is missing or invalid
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = extractToken(req);

    if (token) {
      const payload = JwtHelper.verifyAccessToken(token);
      req.user = payload;
    }
  } catch (error) {
    logger.debug('Optional auth failed, continuing as unauthenticated');
  }

  next();
};
