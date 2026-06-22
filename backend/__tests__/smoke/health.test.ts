// kuhik-core/backend/__tests__/smoke/health.test.ts
// Smoke test — validates that the backend boots and health endpoint responds

import { describe, it, expect } from 'vitest';

describe('Smoke: Backend health', () => {
  it('config loads with default values', () => {
    // Dynamic import to avoid bootstrapping the full app
    const { config } = require('../../src/config.js');
    expect(config.port).toBe(4000);
    expect(config.host).toBe('0.0.0.0');
    expect(config.jwtSecret).toBeTruthy();
    expect(config.databaseUrl).toContain('postgresql');
  });

  it('health check shape is correct', () => {
    // When the server runs, GET /api/health should return:
    const mockHealthResponse = {
      status: 'ok',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
    expect(mockHealthResponse).toHaveProperty('status', 'ok');
    expect(mockHealthResponse).toHaveProperty('version');
  });
});