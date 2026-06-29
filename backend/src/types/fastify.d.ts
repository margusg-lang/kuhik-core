import "fastify";
import type { PrismaClient } from "@prisma/client";
import type {
  FastifyReply,
  FastifyRequest as FastifyRequestType,
} from "fastify";
import type { Environment } from "../config/environment.js";
import type { AuthenticatedIdentity } from "../modules/auth/auth.types.js";

declare module "fastify" {
  interface FastifyInstance {
    environment: Environment;
    database?: PrismaClient;
    authenticate: (
      request: FastifyRequestType,
      reply: FastifyReply,
    ) => Promise<void>;
    requireAnyRole: (
      identity: AuthenticatedIdentity,
      roles: AuthenticatedIdentity["role"][],
    ) => void;
  }

  interface FastifyRequest {
    requestId: string;
    correlationId: string;
    identity: AuthenticatedIdentity | null;
  }
}
