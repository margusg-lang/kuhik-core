import type { Environment } from "../../config/environment.js";
import type { AuthRepository, AuthUserRecord } from "./auth.repository.js";
import type {
  AuthenticatedIdentity,
  AuthenticatedUser,
  AuthTokens,
} from "./auth.types.js";
import {
  invalidCredentialsError,
  invalidRefreshTokenError,
  permissionDeniedError,
} from "./auth.errors.js";
import { verifyPassword } from "./password.service.js";
import {
  createRefreshToken,
  getRefreshExpiry,
  hashRefreshToken,
  signAccessToken,
} from "./token.service.js";

export class AuthService {
  public constructor(
    private readonly repository: AuthRepository,
    private readonly environment: Environment,
  ) {}

  public async login(input: {
    email: string;
    password: string;
  }): Promise<{ user: AuthenticatedUser; tokens: AuthTokens }> {
    const user = await this.repository.findUserByEmail(input.email);

    if (!user) {
      throw invalidCredentialsError();
    }

    if (!isUserAllowedToAuthenticate(user)) {
      throw invalidCredentialsError();
    }

    const passwordValid = await verifyPassword(
      user.passwordHash,
      input.password,
    );

    if (!passwordValid) {
      await this.repository.markFailedLogin(user.id);
      throw invalidCredentialsError();
    }

    await this.repository.markSuccessfulLogin(user.id);

    const tokens = await this.createTokens(user);

    return {
      user: toAuthenticatedUser(user),
      tokens,
    };
  }

  public async refresh(
    refreshToken: string,
  ): Promise<{ user: AuthenticatedUser; tokens: AuthTokens }> {
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const session =
      await this.repository.findActiveSessionByRefreshTokenHash(
        refreshTokenHash,
      );

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now() ||
      !isUserAllowedToAuthenticate(session.user)
    ) {
      throw invalidRefreshTokenError();
    }

    await this.repository.revokeSession(session.id);

    const tokens = await this.createTokens(session.user);

    return {
      user: toAuthenticatedUser(session.user),
      tokens,
    };
  }

  public async logout(refreshToken: string): Promise<void> {
    const session = await this.repository.findActiveSessionByRefreshTokenHash(
      hashRefreshToken(refreshToken),
    );

    if (!session || session.revokedAt) {
      return;
    }

    await this.repository.revokeSession(session.id);
  }

  public requireOrganizationScope(identity: AuthenticatedIdentity): string {
    if (!identity.organizationId) {
      throw permissionDeniedError();
    }

    return identity.organizationId;
  }

  private async createTokens(user: AuthUserRecord): Promise<AuthTokens> {
    const refreshToken = createRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const refreshTokenExpiresAt = getRefreshExpiry(this.environment);

    const session = await this.repository.createSession({
      userId: user.id,
      refreshTokenHash,
      expiresAt: refreshTokenExpiresAt,
    });

    const { accessToken, expiresAt: accessTokenExpiresAt } =
      await signAccessToken(this.environment, {
        userId: user.id,
        personId: user.personId,
        organizationId: user.organizationId,
        role: user.role,
        sessionId: session.id,
        tokenVersion: user.tokenVersion,
      });

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: accessTokenExpiresAt.toISOString(),
      refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
    };
  }
}

function isUserAllowedToAuthenticate(user: AuthUserRecord): boolean {
  if (user.status !== "ACTIVE") {
    return false;
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    return false;
  }

  if (user.role !== "SYSTEM_ADMIN" && !user.organizationId) {
    return false;
  }

  return true;
}

function toAuthenticatedUser(user: AuthUserRecord): AuthenticatedUser {
  return {
    id: user.id,
    personId: user.personId,
    organizationId: user.organizationId,
    email: user.email,
    role: user.role,
  };
}
