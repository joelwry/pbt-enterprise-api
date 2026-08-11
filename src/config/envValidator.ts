import { z } from 'zod';
import logger from '@/core/logger/logger';

// Define environment schema with Zod
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'testing']).default('development'),
  PORT: z.coerce.number().default(5000),
  API_VERSION: z.string().default('v1'),
  APP_NAME: z.string().default('PBT Backend API'),

  // Database
  MONGODB_URI: z.string().url('Invalid MongoDB URI').describe('MongoDB connection string'),
  MONGODB_DB_NAME: z.string().default('pbt'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').describe('Secret for signing access tokens'),
  JWT_EXPIRY: z.string().default('15m').describe('Access token expiry time'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters').describe('Secret for signing refresh tokens'),
  JWT_REFRESH_EXPIRY: z.string().default('7d').describe('Refresh token expiry time'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000').describe('CORS allowed origin'),

  // Email Configuration
  SMTP_HOST: z.string().optional().describe('SMTP host for email'),
  SMTP_PORT: z.coerce.number().optional().describe('SMTP port'),
  SMTP_USER: z.string().optional().describe('SMTP username'),
  SMTP_PASS: z.string().optional().describe('SMTP password'),
  SMTP_FROM: z.string().email().optional().describe('Sender email address'),
  SMTP_FROM_NAME: z.string().optional().default('PBT').describe('Sender name'),

  // Cloudinary (File uploads)
  CLOUDINARY_CLOUD_NAME: z.string().optional().describe('Cloudinary cloud name'),
  CLOUDINARY_API_KEY: z.string().optional().describe('Cloudinary API key'),
  CLOUDINARY_API_SECRET: z.string().optional().describe('Cloudinary API secret'),

  // Security
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000).describe('Rate limit window in milliseconds'),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100).describe('Max requests per window'),
  ENABLE_HELMET: z.enum(['true', 'false']).default('true'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'text']).default('json'),
  ENABLE_CONSOLE_LOGS: z.enum(['true', 'false']).default('true'),

  // Features
  ENABLE_EMAIL_VERIFICATION: z.enum(['true', 'false']).default('true'),
  ENABLE_PASSWORD_RESET: z.enum(['true', 'false']).default('true'),
  ENABLE_SOFT_DELETE: z.enum(['true', 'false']).default('true'),

  // Health Check
  HEALTH_CHECK_ENABLED: z.enum(['true', 'false']).default('true'),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validate and parse environment variables
 * Throws error if validation fails
 */
export function validateEnv(): EnvConfig {
  const env = process.env;

  try {
    const validated = envSchema.parse(env);
    logger.info('Environment variables validated successfully');
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('\n');

      logger.error('Environment validation failed:', error);
      console.error('\n❌ Environment Configuration Error:\n', missingVars);
      console.error('\nPlease check your .env file and ensure all required variables are set correctly.');
      console.error('Reference .env.example for required variables.\n');

      throw new Error('Environment validation failed. Server cannot start.');
    }
    throw error;
  }
}

/**
 * Validate critical dependencies at startup
 */
export function validateStartupConfig(config: EnvConfig): void {
  const errors: string[] = [];

  // Check production-specific requirements
  if (config.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      errors.push('Production: JWT_SECRET must be set and be at least 32 characters');
    }
    if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
      errors.push('Production: JWT_REFRESH_SECRET must be set and be at least 32 characters');
    }
    if (!process.env.MONGODB_URI) {
      errors.push('Production: MONGODB_URI must be configured');
    }
  }

  // Warn about optional but important configs
  if (!config.SMTP_HOST) {
    logger.warn('Email configuration not set. Email features will not work.');
  }

  if (!config.CLOUDINARY_CLOUD_NAME) {
    logger.warn('Cloudinary not configured. File uploads will not work.');
  }

  if (errors.length > 0) {
    logger.error('Startup validation failed:', errors);
    console.error('\n❌ Critical Configuration Issues:\n', errors.join('\n'));
    throw new Error('Startup validation failed');
  }

  logger.info('Startup configuration validated');
}
