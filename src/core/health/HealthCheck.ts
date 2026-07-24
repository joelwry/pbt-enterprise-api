import { Connection } from 'mongoose';

export enum HealthStatus {
  UP = 'UP',
  DOWN = 'DOWN',
  DEGRADED = 'DEGRADED',
}

export interface HealthCheckResponse {
  status: HealthStatus;
  timestamp: Date;
  uptime: number;
  database?: HealthComponentStatus;
  redis?: HealthComponentStatus;
  memory?: MemoryStatus;
}

export interface HealthComponentStatus {
  status: HealthStatus;
  responseTime: number;
  message?: string;
}

export interface MemoryStatus {
  used: number;
  total: number;
  percentage: number;
}

export class HealthCheckService {
  constructor(private dbConnection: Connection) {}

  async getDatabaseHealth(): Promise<HealthComponentStatus> {
    try {
      const start = Date.now();
      await this.dbConnection.db.admin().ping();
      const responseTime = Date.now() - start;
      return {
        status: HealthStatus.UP,
        responseTime,
        message: 'Database connection healthy',
      };
    } catch (error: any) {
      return {
        status: HealthStatus.DOWN,
        responseTime: 0,
        message: error.message,
      };
    }
  }

  async getMemoryHealth(): Promise<MemoryStatus> {
    const totalMemory = require('os').totalmem();
    const freeMemory = require('os').freemem();
    const usedMemory = totalMemory - freeMemory;
    const percentage = (usedMemory / totalMemory) * 100;

    return {
      used: Math.round(usedMemory / 1024 / 1024),
      total: Math.round(totalMemory / 1024 / 1024),
      percentage: Math.round(percentage * 100) / 100,
    };
  }

  async getLiveness(): Promise<HealthCheckResponse> {
    return {
      status: HealthStatus.UP,
      timestamp: new Date(),
      uptime: process.uptime(),
    };
  }

  async getReadiness(): Promise<HealthCheckResponse> {
    const database = await this.getDatabaseHealth();
    const memory = await this.getMemoryHealth();

    const status =
      database.status === HealthStatus.UP && memory.percentage < 90
        ? HealthStatus.UP
        : HealthStatus.DEGRADED;

    return {
      status,
      timestamp: new Date(),
      uptime: process.uptime(),
      database,
      memory,
    };
  }
}
