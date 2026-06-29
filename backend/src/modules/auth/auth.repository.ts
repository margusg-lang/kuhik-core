import type { PrismaClient } from "@prisma/client";

export type AuthUserRecord = NonNullable<
  Awaited<ReturnType<AuthRepository["findUserByEmail"]>>
>;

export class AuthRepository {
  public constructor(private readonly database: PrismaClient) {}

  public findUserByEmail(email: string) {
    return this.database.user.findUnique({
      where: { email },
      include: {
        person: true,
      },
    });
  }

  public async markSuccessfulLogin(userId: string): Promise<void> {
    await this.database.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
  }

  public async markFailedLogin(userId: string): Promise<void> {
    await this.database.user.update({
      where: { id: userId },
      data: {
        failedLoginCount: {
          increment: 1,
        },
      },
    });
  }

  public createSession(input: {
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
  }) {
    return this.database.userSession.create({
      data: input,
    });
  }

  public findActiveSessionByRefreshTokenHash(refreshTokenHash: string) {
    return this.database.userSession.findUnique({
      where: { refreshTokenHash },
      include: {
        user: {
          include: {
            person: true,
          },
        },
      },
    });
  }

  public async revokeSession(sessionId: string): Promise<void> {
    await this.database.userSession.update({
      where: { id: sessionId },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  public async markSessionUsed(sessionId: string): Promise<void> {
    await this.database.userSession.update({
      where: { id: sessionId },
      data: {
        lastUsedAt: new Date(),
      },
    });
  }
}
