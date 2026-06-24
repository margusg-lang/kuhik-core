// kuhik-core/backend/src/plugins/auth.ts
// JWT auth plugin — access tokens + refresh tokens + RBAC
// Fastify plugin with decorators and hooks

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config.js';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authorize: (roles: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    generateTokens: (payload: AuthTokenPayload) => { accessToken: string; refreshToken: string };
  }
}

// Override @fastify/jwt's user type declaration
declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: AuthTokenPayload;
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
    userRole: string;
    associationId: string | null;
  }
}

export interface AuthTokenPayload {
  id: string;
  email: string;
  role: string;
  associationId: string | null;
  permissions: string[];
}

export async function registerAuthPlugin(app: FastifyInstance): Promise<void> {
  // DECORATE: authenticate — verify JWT token
  app.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
      const payload = request.user as unknown as AuthTokenPayload;
      request.user = payload;
      request.userId = payload.id;
      request.userRole = payload.role;
      request.associationId = payload.associationId || null;
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized', code: 'TOKEN_INVALID' });
    }
  });

  // DECORATE: authorize — check required roles
  app.decorate('authorize', function (roles: string[]) {
    return async function (request: FastifyRequest, reply: FastifyReply) {
      await app.authenticate(request, reply);
      if (reply.sent) return;

      const user = request.user!;
      if (!roles.includes(user.role) && !user.permissions.includes('*:*:*')) {
        reply.status(403).send({ error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' });
      }
    };
  });

  // DECORATE: generateTokens — create access + refresh tokens
  app.decorate('generateTokens', function (payload: AuthTokenPayload) {
    const accessToken = app.jwt.sign(payload, { expiresIn: config.jwtExpiresIn });
    const refreshToken = app.jwt.sign(
      { id: payload.id, type: 'refresh' },
      { expiresIn: config.jwtRefreshExpiresIn },
    );
    return { accessToken, refreshToken };
  });

  // HOOK: preHandler — set user from token if present
  app.addHook('preHandler', async (request: FastifyRequest) => {
    request.user = null as unknown as AuthTokenPayload;
    request.userId = '';
    request.userRole = '';
    request.associationId = null;

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return;

    try {
      const token = authHeader.replace('Bearer ', '');
      const decoded = app.jwt.decode(token) as AuthTokenPayload;
      if (decoded) {
        request.user = decoded;
        request.userId = decoded.id;
        request.userRole = decoded.role;
        request.associationId = decoded.associationId || null;
      }
    } catch {
      // Token invalid — user stays null (public routes still work)
    }
  });
}