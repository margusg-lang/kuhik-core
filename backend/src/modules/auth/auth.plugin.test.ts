import { UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { buildApp } from "../../app/app.js";
import type { Environment } from "../../config/environment.js";
import { signAccessToken } from "./token.service.js";

const environment: Environment = {
  NODE_ENV: "test",
  LOG_LEVEL: "silent",
  BACKEND_HOST: "127.0.0.1",
  BACKEND_PORT: 3001,
  CORS_ORIGIN: "http://localhost:3000",
  JWT_SECRET: "test-access-secret-with-at-least-32-characters",
  JWT_REFRESH_SECRET: "test-refresh-secret-with-at-least-32-characters",
  JWT_ACCESS_TOKEN_TTL_SECONDS: 900,
  JWT_REFRESH_TOKEN_TTL_DAYS: 30,
};

describe("auth plugin", () => {
  it("protects current identity endpoint", async () => {
    const app = await buildApp({ environment });
    const { accessToken } = await signAccessToken(environment, {
      userId: "user-id",
      personId: "person-id",
      organizationId: "organization-id",
      role: UserRole.MANAGER,
      sessionId: "session-id",
      tokenVersion: 1,
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      identity: {
        userId: "user-id",
        personId: "person-id",
        organizationId: "organization-id",
        role: UserRole.MANAGER,
        sessionId: "session-id",
        tokenVersion: 1,
      },
    });

    await app.close();
  });

  it("rejects missing authentication", async () => {
    const app = await buildApp({ environment });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});
