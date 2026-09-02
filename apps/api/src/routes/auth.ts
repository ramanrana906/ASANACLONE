import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { loginSchema, signupSchema, type User } from "@asanaClone/shared";
import { db } from "../db";
import { users } from "../db/schema";

function toPublicUser(row: typeof users.$inferSelect): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: row.createdAt.toISOString(),
  };
}

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/api/auth/signup",
    { schema: { body: signupSchema } },
    async (request, reply) => {
      const { email, password, name } = request.body;

      const existing = await db.query.users.findFirst({
        where: eq(users.email, email),
      });
      if (existing) {
        return reply.status(409).send({ error: "Email already in use" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const [user] = await db
        .insert(users)
        .values({ email, name, passwordHash })
        .returning();

      const token = app.jwt.sign({ sub: user.id });
      reply.setCookie("session", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });

      return reply.status(201).send(toPublicUser(user));
    },
  );

  app.post(
    "/api/auth/login",
    { schema: { body: loginSchema } },
    async (request, reply) => {
      const { email, password } = request.body;

      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return reply.status(401).send({ error: "Invalid email or password" });
      }

      const token = app.jwt.sign({ sub: user.id });
      reply.setCookie("session", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });

      return reply.send(toPublicUser(user));
    },
  );

  app.post("/api/auth/logout", async (_request, reply) => {
    reply.clearCookie("session", { path: "/" });
    return reply.send({ ok: true });
  });

  app.get(
    "/api/auth/me",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, request.user.sub),
      });
      if (!user) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      return reply.send(toPublicUser(user));
    },
  );
};
