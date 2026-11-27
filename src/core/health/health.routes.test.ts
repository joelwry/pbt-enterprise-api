import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import healthRoutes from '@/core/health/health.routes';
import { buildOpenApiSpec } from '@/docs/openapi/build-spec';

describe('MongoDB health endpoint', () => {
  const app = express().use(healthRoutes);
  let originalDbDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalDbDescriptor = Object.getOwnPropertyDescriptor(mongoose.connection, 'db');
  });

  afterEach(() => {
    if (originalDbDescriptor) {
      Object.defineProperty(mongoose.connection, 'db', originalDbDescriptor);
    } else {
      delete (mongoose.connection as { db?: unknown }).db;
    }
  });

  it('pings MongoDB and returns the ping latency', async () => {
    const ping = jest.fn().mockResolvedValue({ ok: 1 });
    Object.defineProperty(mongoose.connection, 'db', {
      configurable: true,
      value: { admin: () => ({ ping }) },
    });

    const response = await request(app).get('/health/mongodb');

    expect(ping).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      status: 'healthy',
      connected: true,
    });
    expect(response.body.data.responseTimeMs).toEqual(expect.any(Number));
  });

  it('returns 503 when MongoDB ping fails', async () => {
    const ping = jest.fn().mockRejectedValue(new Error('connection lost'));
    Object.defineProperty(mongoose.connection, 'db', {
      configurable: true,
      value: { admin: () => ({ ping }) },
    });

    const response = await request(app).get('/health/mongodb');

    expect(ping).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('MongoDB ping failed');
  });

  it('returns 503 when the MongoDB connection is not initialized', async () => {
    Object.defineProperty(mongoose.connection, 'db', {
      configurable: true,
      value: undefined,
    });

    const response = await request(app).get('/health/mongodb');

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('MongoDB is unavailable');
  });

  it('documents the endpoint in the generated OpenAPI spec', () => {
    const spec = buildOpenApiSpec();
    const operation = spec.paths['/health/mongodb'].get as {
      summary: string;
      responses: Record<string, unknown>;
    };

    expect(operation.summary).toContain('Ping MongoDB');
    expect(operation.responses).toHaveProperty('200');
    expect(operation.responses).toHaveProperty('503');
    expect(operation).not.toHaveProperty('security');
  });
});
