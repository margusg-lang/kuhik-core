import fp from "fastify-plugin";
import type {
  FastifyInstance,
  FastifyPluginCallback,
  FastifyRequest,
} from "fastify";
import { requireDatabase } from "../../shared/database/require-database.js";
import { AuthRepository } from "./auth.repository.js";
import { AuthService } from "./auth.service.js";
import {
  authenticationRequiredError,
  permissionDeniedError,
} from "./auth.errors.js";
import { loginSchema, logoutSchema, refreshSchema } from "./auth.schemas.js";
import { verifyAccessToken } from "./token.service.js";
import type { AuthenticatedIdentity } from "./auth.types.js";

export const authPlugin: FastifyPluginCallback = fp((app, _options, done) => {
  void _options;

  app.decorateRequest("identity", null);

  app.decorate("authenticate", async (request: FastifyRequest) => {
    const header = request.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      throw authenticationRequiredError();
    }

    const accessToken = header.slice("Bearer ".length);
    request.identity = await verifyAccessToken(app.environment, accessToken);
  });

  app.decorate(
    "requireAnyRole",
    (
      identity: AuthenticatedIdentity,
      roles: AuthenticatedIdentity["role"][],
    ) => {
      if (!roles.includes(identity.role)) {
        throw permissionDeniedError();
      }
    },
  );

  app.post("/api/v1/auth/login", async (request) => {
    const input = loginSchema.parse(request.body);
    const service = createAuthService(app);

    return service.login(input);
  });

  app.post("/api/v1/auth/refresh", async (request) => {
    const input = refreshSchema.parse(request.body);
    const service = createAuthService(app);

    return service.refresh(input.refreshToken);
  });

  app.post("/api/v1/auth/logout", async (request) => {
    const input = logoutSchema.parse(request.body);
    const service = createAuthService(app);

    await service.logout(input.refreshToken);

    return {
      status: "ok",
    };
  });

  app.get(
    "/api/v1/auth/me",
    {
      preHandler: [app.authenticate],
    },
    (request) => ({
      identity: request.identity,
    }),
  );

  done();
});

function createAuthService(app: FastifyInstance): AuthService {
  return new AuthService(
    new AuthRepository(requireDatabase(app)),
    app.environment,
  );
}
