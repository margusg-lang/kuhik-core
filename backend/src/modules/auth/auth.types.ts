import type { UserRole } from "@prisma/client";

export interface AuthenticatedIdentity {
  userId: string;
  personId: string;
  organizationId: string | null;
  role: UserRole;
  sessionId: string;
  tokenVersion: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
}

export interface AuthenticatedUser {
  id: string;
  personId: string;
  organizationId: string | null;
  email: string;
  role: UserRole;
}
