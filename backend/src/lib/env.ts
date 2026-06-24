import 'dotenv/config';

// kuhik-core/backend/src/lib/env.ts
// Wave 9: Centralized environment validation — fail-fast on misconfiguration
// No defaults for production-sensitive values

export interface EnvConfig {
  NODE_ENV: 'development' | 'staging' | 'production' | 'test';
  PORT: number;
  HOST: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  CORS_ORIGINS: string[];
  RATE_LIMIT_MAX: number;
  RATE_LIMIT_WINDOW: string;
  REDIS_URL: string | undefined;
  STORAGE_TYPE: 'local' | 's3';
  UPLOAD_DIR: string;
  S3_BUCKET: string | undefined;
  S3_REGION: string | undefined;
  S3_ENDPOINT: string | undefined;
}

const ERR_PREFIX = '❌ ENV ERROR';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    console.error(`${ERR_PREFIX}: Missing required environment variable: ${key}`);
    process.exit(1);
  }
  return value.trim();
}

function optionalEnv(key: string, defaultValue?: string): string | undefined {
  const value = process.env[key];
  if (!value || value.trim() === '') return defaultValue;
  return value.trim();
}

export function loadEnv(): EnvConfig {
  const nodeEnv = optionalEnv('NODE_ENV', 'development') as EnvConfig['NODE_ENV'];
  if (!['development', 'staging', 'production', 'test'].includes(nodeEnv)) {
    console.error(`${ERR_PREFIX}: NODE_ENV must be one of: development, staging, production, test (got: ${nodeEnv})`);
    process.exit(1);
  }

  const config: EnvConfig = {
    NODE_ENV: nodeEnv,
    PORT: parseInt(optionalEnv('PORT', '4000')!, 10),
    HOST: optionalEnv('HOST', '0.0.0.0')!,
    DATABASE_URL: requireEnv('DATABASE_URL'),
    JWT_SECRET: requireEnv('JWT_SECRET'),
    JWT_REFRESH_SECRET: requireEnv('JWT_REFRESH_SECRET'),
    CORS_ORIGINS: optionalEnv('CORS_ORIGINS', 'http://localhost:3000')!.split(','),
    RATE_LIMIT_MAX: parseInt(optionalEnv('RATE_LIMIT_MAX', '100')!, 10),
    RATE_LIMIT_WINDOW: optionalEnv('RATE_LIMIT_WINDOW', '1 minute')!,
    REDIS_URL: optionalEnv('REDIS_URL'),
    STORAGE_TYPE: (optionalEnv('STORAGE_TYPE', 'local') === 's3' ? 's3' : 'local') as EnvConfig['STORAGE_TYPE'],
    UPLOAD_DIR: optionalEnv('UPLOAD_DIR', './uploads')!,
    S3_BUCKET: optionalEnv('S3_BUCKET'),
    S3_REGION: optionalEnv('S3_REGION'),
    S3_ENDPOINT: optionalEnv('S3_ENDPOINT'),
  };

  if (nodeEnv === 'production') {
    // In production, JWT secrets must NOT be defaults
    if (config.JWT_SECRET === 'kuhik-jwt-secret-change-in-production' || config.JWT_SECRET.length < 20) {
      console.error(`${ERR_PREFIX}: Production requires a strong JWT_SECRET (min 20 chars)`);
      process.exit(1);
    }
    if (config.JWT_REFRESH_SECRET === 'kuhik-refresh-secret' || config.JWT_REFRESH_SECRET.length < 20) {
      console.error(`${ERR_PREFIX}: Production requires a strong JWT_REFRESH_SECRET (min 20 chars)`);
      process.exit(1);
    }
  }

  console.log(`✓ Environment loaded [${config.NODE_ENV}]`);
  return config;
}

export const env = loadEnv();