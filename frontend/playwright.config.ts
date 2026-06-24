// kuhik-core/frontend/playwright.config.ts
// Playwright E2E test configuration for Kuhik system validation

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // Sequential execution: each step depends on previous
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
  ],

  timeout: 120_000, // 2 min per test — accounts for backend processing
  expect: {
    timeout: 30_000,
  },

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  },

  projects: [
    {
      name: 'kuhik-api-e2e',
      testMatch: '**/kuhik-flow.spec.ts',
    },
    {
      name: 'kuhik-financial-correctness',
      testMatch: '**/financial-correctness.spec.ts',
    },
  ],
});