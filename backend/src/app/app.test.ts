import { describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import type { Environment } from "../config/environment.js";

const environment: Environment = {
  NODE_ENV: "test",
  LOG_LEVEL: "silent",
  BACKEND_HOST: "127.0.0.1",
  BACKEND_PORT: 3001,
  CORS_ORIGIN: "http://localhost:3000",
  JWT_ACCESS_TOKEN_TTL_SECONDS: 900,
  JWT_REFRESH_TOKEN_TTL_DAYS: 30,
};

describe("backend app spine", () => {
  it("responds to health checks with request context", async () => {
    const app = await buildApp({ environment });

    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: {
        "x-request-id": "test-request",
        "x-correlation-id": "test-correlation",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ok",
      service: "kuhik-backend",
      requestId: "test-request",
      correlationId: "test-correlation",
    });

    await app.close();
  });
});
