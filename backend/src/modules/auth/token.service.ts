import { createHash, randomBytes } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import type { Environment } from "../../config/environment.js";
import type { AuthenticatedIdentity } from "./auth.types.js";
import { authenticationRequiredError } from "./auth.errors.js";

const encoder = new TextEncoder();

export interface AccessTokenClaims extends AuthenticatedIdentity {
  type: "access";
}

export function createRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

export function hashRefreshToken(refreshToken: string): string {
  return createHash("sha256").update(refreshToken).digest("hex");
}

export function getRefreshExpiry(
  environment: Environment,
  now = new Date(),
): Date {
  const expiresAt = new Date(now);
  expiresAt.setDate(
    expiresAt.getDate() + environment.JWT_REFRESH_TOKEN_TTL_DAYS,
  );
  return expiresAt;
}

export function getAccessExpiry(
  environment: Environment,
  now = new Date(),
): Date {
  return new Date(
    now.getTime() + environment.JWT_ACCESS_TOKEN_TTL_SECONDS * 1000,
  );
}

export async function signAccessToken(
  environment: Environment,
  identity: AuthenticatedIdentity,
): Promise<{ accessToken: string; expiresAt: Date }> {
  if (!environment.JWT_SECRET) {
    throw authenticationRequiredError();
  }

  const expiresAt = getAccessExpiry(environment);

  const accessToken = await new SignJWT({
    ...identity,
    type: "access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(identity.userId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(encoder.encode(environment.JWT_SECRET));

  return { accessToken, expiresAt };
}

export async function verifyAccessToken(
  environment: Environment,
  accessToken: string,
): Promise<AuthenticatedIdentity> {
  if (!environment.JWT_SECRET) {
    throw authenticationRequiredError();
  }

  try {
    const { payload } = await jwtVerify<AccessTokenClaims>(
      accessToken,
      encoder.encode(environment.JWT_SECRET),
    );

    if (payload.type !== "access") {
      throw authenticationRequiredError();
    }

    return {
      userId: payload.userId,
      personId: payload.personId,
      organizationId: payload.organizationId,
      role: payload.role,
      sessionId: payload.sessionId,
      tokenVersion: payload.tokenVersion,
    };
  } catch {
    throw authenticationRequiredError();
  }
}
