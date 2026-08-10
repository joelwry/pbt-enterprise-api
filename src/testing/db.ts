import mongoose from 'mongoose';
import { config } from '@/config/environment';

/** Connects to the isolated test database (see jest.env.ts) for integration tests. */
export async function connectTestDb(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(config.MONGODB_URI);
}

/** Drops every collection between tests so state never leaks across test files/cases. */
export async function clearTestDb(): Promise<void> {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
}

export async function disconnectTestDb(): Promise<void> {
  await mongoose.connection.close();
}
