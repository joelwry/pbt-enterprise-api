import { Router, Request, Response } from 'express';
import logger from '@/core/logger/logger';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import { asyncHandler } from '@/core/middleware/asyncHandler';
import mongoose from 'mongoose';

const router = Router();

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  checks: {
    database: 'ok' | 'error';
    memory: string;
    cpu: string;
  };
}

interface ReadinessCheckResponse {
  ready: boolean;
  timestamp: string;
  checks: {
    database: { status: 'ok' | 'error'; message?: string };
    storage: { status: 'ok' | 'error'; message?: string };
    email: { status: 'ok' | 'error'; message?: string };
    payment : {status :'ok' | 'error';message? : string};
  };
}

/**
 * Basic health check - liveness probe
 * Used by load balancers to determine if the service is alive
 */
router.get(
  '/health',
  asyncHandler(async (req: Request, res: Response) => {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const healthCheck: HealthCheckResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: mongoose.connection.readyState === 1 ? 'ok' : 'error',
        memory: `${Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)}%`,
        cpu: `${Math.round(cpuUsage.user / 1000)}ms`,
      },
    };

    // If any critical check fails, return degraded
    if (healthCheck.checks.database !== 'ok') {
      healthCheck.status = 'degraded';
    }

    res.status(healthCheck.status === 'healthy' ? 200 : 503).json(healthCheck);
  })
);

/**
 * Readiness check - deployment probe
 * Verifies that all dependencies are ready before accepting traffic
 */
router.get(
  '/ready',
  asyncHandler(async (req: Request, res: Response) => {
    const checks: ReadinessCheckResponse['checks'] = {
      database: { status: 'ok', message: '' },
      storage: { status: 'ok', message: '' },
      email: { status: 'ok', message: '' },
      payment: {status : 'ok', message : ""},
    };

    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      checks.database.status = 'error';
      checks.database.message = `MongoDB connection state: ${mongoose.connection.readyState}`;
    }

    // Check storage configuration (Cloudinary)
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      logger.warn('Cloudinary not configured - storage may be unavailable');
      checks.storage.status = 'error';
      checks.storage.message = 'Cloudinary not configured';
    }

    // Check email configuration
    if (!process.env.SMTP_HOST) {
      logger.warn('SMTP not configured - email features unavailable');
      checks.email.status = 'error';
      checks.email.message = 'SMTP not configured';
    }

    if(!process.env.STRIPE_SECRET_KEY){
      logger.warn('Payment not configured - in app payment features unavailable');
      checks.payment.status = 'error';
      checks.payment.message = 'Payment Secret key not configured... ';
    }

    if(!process.env.STRIPE_WEBHOOK_SECRET){
      logger.warn('Payment Webhook not configured -');
      checks.payment.status = 'error';
      checks.payment.message += 'payment Webhook not configured';
    }

    const ready =
      checks.database.status === 'ok' &&
      checks.storage.status === 'ok' &&
      checks.email.status === 'ok';

    const response: ReadinessCheckResponse = {
      ready,
      timestamp: new Date().toISOString(),
      checks,
    };

    res.status(ready ? 200 : 503).json(response);

    if (ready) {
      logger.info('Readiness check passed - all dependencies ready');
    } else {
      logger.warn('Readiness check failed - some dependencies not ready', checks);
    }
  })
);

/**
 * Detailed diagnostics endpoint (development only)
 */
router.get(
  '/health/details',
  asyncHandler(async (req: Request, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
      ResponseHandler.notFound(res, 'Not available in production');
      return;
    }

    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        nodeVersion: process.version,
        platform: process.platform,
      },
      process: {
        uptime: process.uptime(),
        pid: process.pid,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
      },
      database: {
        connected: mongoose.connection.readyState === 1,
        connectionState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        name: mongoose.connection.name,
      },
      configuration: {
        corsOrigin: process.env.CORS_ORIGIN,
        apiVersion: process.env.API_VERSION,
        rateLimitEnabled: process.env.RATE_LIMIT_MAX_REQUESTS !== '0',
      },
    };

    ResponseHandler.ok(res, 'Diagnostics retrieved', diagnostics);
  })
);

export default router;
