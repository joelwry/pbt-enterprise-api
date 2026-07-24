import { createApp } from '@/app';
import { config, validateConfig } from '@/config/environment';
import { connectDB, disconnectDB } from '@/database/connection';
import logger from '@/core/logger/logger';

async function startServer(): Promise<void> {
  try {
    // Validate configuration
    validateConfig();

    // Connect to database
    await connectDB();

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(config.PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${config.PORT}`);
      logger.info(`📚 API Documentation: http://localhost:${config.PORT}/api/docs`);
      logger.info(`🔧 Environment: ${config.NODE_ENV}`);
      logger.info(`🛣️  API Version: /api/${config.API_VERSION}`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');
        await disconnectDB();
        logger.info('Database disconnected');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Graceful shutdown timeout, forcing exit');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { reason, promise });
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

startServer();
