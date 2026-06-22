// kuhik-core/backend/src/config.ts
// Central configuration — all settings from env vars

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  host: process.env.HOST || '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET || 'kuhik-jwt-secret-change-in-production',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'kuhik-refresh-secret',
  jwtExpiresIn: '15m',
  jwtRefreshExpiresIn: '7d',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://kuhik:kuhik_secret@localhost:5432/kuhik',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3456').split(','),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  rateLimitWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',

  // Business rules (configurable per KÜ via Settings Engine)
  defaultReadingWindowStart: 25,
  defaultReadingWindowEnd: 5,
  defaultAnomalyThreshold: 30,
  defaultCriticalThreshold: 100,
  defaultInvoiceDueDays: 30,
  defaultLatePaymentInterest: 0.0005,
  defaultQuorum: 50,

  // Storage
  storageType: process.env.STORAGE_TYPE || 'local',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  s3Bucket: process.env.S3_BUCKET || '',
  s3Region: process.env.S3_REGION || '',
  s3Endpoint: process.env.S3_ENDPOINT || '',
};