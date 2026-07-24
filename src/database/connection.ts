import mongoose from 'mongoose';
import { config } from '@/config/environment';
import logger from '@/core/logger/logger';

export async function connectDB(): Promise<void> {
  try {
    logger.info(`Connecting to MongoDB at ${config.MONGODB_URI}`);

    await mongoose.connect(config.MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
    });

    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection failed', { error });
    process.exit(1);
  }
}

export async function disconnectDB(): Promise<void> {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('MongoDB disconnection failed', { error });
    process.exit(1);
  }
}
