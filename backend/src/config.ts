// kuhik-core/backend/src/config.ts
// Deprecated — use src/lib/env.ts instead
// Kept as re-export for backward compatibility during migration
// Will be removed in next major version

import { env } from './lib/env.js';

export const config = {
  port: env.PORT,
  host: env.HOST,
  jwtSecret: env.JWT_SECRET,
  jwtRefreshSecret: env.JWT_REFRESH_SECRET,
  jwtExpiresIn: '15m',
  jwtRefreshExpiresIn: '7d',
  databaseUrl: env.DATABASE_URL,
  redisUrl: env.REDIS_URL,
  corsOrigins: env.CORS_ORIGINS,
  rateLimitMax: env.RATE_LIMIT_MAX,
  rateLimitWindow: env.RATE_LIMIT_WINDOW,
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',

  // Business rules (configurable per KÜ via Settings Engine)
  defaultReadingWindowStart: 25,
  defaultReadingWindowEnd: 5,
  defaultAnomalyThreshold: 30,
  defaultCriticalThreshold: 100,
  defaultInvoiceDueDays: 30,
  defaultLatePaymentInterest: 0.0005,
  defaultQuorum: 50,

  // Storage
  storageType: env.STORAGE_TYPE,
  uploadDir: env.UPLOAD_DIR,
  s3Bucket: env.S3_BUCKET || '',
  s3Region: env.S3_REGION || '',
  s3Endpoint: env.S3_ENDPOINT || '',
};