/**
 * Runs before every test file's own imports. Points the app at a separate
 * test database on the same local MongoDB instance dev already uses
 * (`pbtDb_test` instead of `pbtDb`), so the test suite never touches real
 * dev/seed data. `dotenv.config()` (called inside config/environment.ts)
 * does not override an already-set env var, so this wins.
 */
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/pbtDb_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
