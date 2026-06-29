import type { FastifyServerOptions } from "fastify";
import type { Environment } from "../../config/environment.js";

type LoggerOptions = NonNullable<FastifyServerOptions["logger"]>;

export function buildLoggerOptions(environment: Environment): LoggerOptions {
  return {
    level: environment.LOG_LEVEL,
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "password",
        "passwordHash",
        "refreshToken",
        "refreshTokenHash",
        "token",
        "*.password",
        "*.passwordHash",
        "*.refreshToken",
        "*.refreshTokenHash",
        "*.token",
      ],
      censor: "[REDACTED]",
    },
  };
}
