import type { FastifyReply, FastifyRequest } from "fastify";
import type { OAuth2Namespace } from "@fastify/oauth2";
import type { UserRole } from "@asanaClone/shared";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (
      ...roles: UserRole[]
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    googleOAuth2: OAuth2Namespace;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    user: {
      sub: number;
    };
  }
}
