import { UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import type { Environment } from "../../config/environment.js";
import {
  createRefreshToken,
  hashRefreshToken,
  signAccessToken,
  verifyAccessToken,
} from "./token.service.js";

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

describe("token service", () => {
  it("signs and verifies access tokens", async () => {
    const { accessToken } = await signAccessToken(environment, {
      userId: "user-id",
      personId: "person-id",
      organizationId: "organization-id",
      role: UserRole.MANAGER,
      sessionId: "session-id",
      tokenVersion: 1,
    });

    await expect(
      verifyAccessToken(environment, accessToken),
    ).resolves.toMatchObject({
      userId: "user-id",
      personId: "person-id",
      organizationId: "organization-id",
      role: UserRole.MANAGER,
      sessionId: "session-id",
      tokenVersion: 1,
    });
  });

  it("creates hashable opaque refresh tokens", () => {
    const refreshToken = createRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);

    expect(refreshToken).not.toHaveLength(0);
    expect(refreshTokenHash).toHaveLength(64);
    expect(refreshTokenHash).not.toBe(refreshToken);
  });
});
