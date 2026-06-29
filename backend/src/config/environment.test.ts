import { describe, expect, it } from "vitest";
import { loadEnvironment } from "./environment.js";

describe("loadEnvironment", () => {
  it("applies safe development defaults", () => {
    const environment = loadEnvironment({
      NODE_ENV: "test",
    });

    expect(environment).toMatchObject({
      NODE_ENV: "test",
      LOG_LEVEL: "info",
      BACKEND_HOST: "0.0.0.0",
      BACKEND_PORT: 3001,
      CORS_ORIGIN: "http://localhost:3000",
      JWT_ACCESS_TOKEN_TTL_SECONDS: 900,
      JWT_REFRESH_TOKEN_TTL_DAYS: 30,
    });
  });

  it("fails fast on invalid configuration", () => {
    expect(() =>
      loadEnvironment({
        NODE_ENV: "test",
        BACKEND_PORT: "not-a-port",
      }),
    ).toThrow("Invalid environment configuration");
  });

  it("requires database configuration outside test environment", () => {
    expect(() =>
      loadEnvironment({
        NODE_ENV: "development",
      }),
    ).toThrow("DATABASE_URL is required outside test environment");
  });

  it("requires jwt secrets outside test environment", () => {
    expect(() =>
      loadEnvironment({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://kuhik:kuhik@localhost:5433/kuhik",
      }),
    ).toThrow("JWT_SECRET is required outside test environment");
  });
});
