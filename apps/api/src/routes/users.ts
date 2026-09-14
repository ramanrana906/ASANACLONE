import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { addEmailSchema, updateProfileSchema, type UserEmail } from "@asanaClone/shared";
import { db } from "../db";
import { sessions, userEmails, users, workspaces } from "../db/schema";
import { toPublicUser } from "../services/users";
import {
  clearSessionCookies,
  readRefreshToken,
  revokeAllSessions,
  revokeOtherSessions,
} from "../infrastructure/session";

const emailIdParamsSchema = z.object({ id: z.coerce.number() });

function toPublicEmail(row: typeof userEmails.$inferSelect): UserEmail {
  return {
    id: row.id,
    email: row.email,
    isPreferred: row.isPreferred,
    createdAt: row.createdAt.toISOString(),
  };
}

export const usersRoutes: FastifyPluginAsyncZod = async (app) => {
  app.patch(
    "/api/users/me",
    { schema: { body: updateProfileSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const { outOfOfficeUntil, ...rest } = request.body;
      const [user] = await db
        .update(users)
        .set({
          ...rest,
          ...(outOfOfficeUntil !== undefined
            ? { outOfOfficeUntil: outOfOfficeUntil ? new Date(outOfOfficeUntil) : null }
            : {}),
        })
        .where(eq(users.id, request.user.sub))
        .returning();

      return reply.send(toPublicUser(user));
    },
  );

  app.get(
    "/api/users/me/emails",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const rows = await db.query.userEmails.findMany({
        where: eq(userEmails.userId, request.user.sub),
      });
      return reply.send(rows.map(toPublicEmail));
    },
  );

  app.post(
    "/api/users/me/emails",
    { schema: { body: addEmailSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const existing = await db.query.userEmails.findFirst({
        where: eq(userEmails.email, request.body.email),
      });
      if (existing) {
        return reply.status(409).send({ error: "Email already in use" });
      }

      const [email] = await db
        .insert(userEmails)
        .values({ userId: request.user.sub, email: request.body.email })
        .returning();

      return reply.status(201).send(toPublicEmail(email));
    },
  );

  app.delete(
    "/api/users/me/emails/:id",
    { schema: { params: emailIdParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const [deleted] = await db
        .delete(userEmails)
        .where(and(eq(userEmails.id, request.params.id), eq(userEmails.userId, request.user.sub)))
        .returning();

      if (!deleted) {
        return reply.status(404).send({ error: "Email not found" });
      }
      return reply.send({ ok: true });
    },
  );

  app.patch(
    "/api/users/me/emails/:id/preferred",
    { schema: { params: emailIdParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const target = await db.query.userEmails.findFirst({
        where: and(eq(userEmails.id, request.params.id), eq(userEmails.userId, request.user.sub)),
      });
      if (!target) {
        return reply.status(404).send({ error: "Email not found" });
      }

      await db
        .update(userEmails)
        .set({ isPreferred: false })
        .where(and(eq(userEmails.userId, request.user.sub), ne(userEmails.id, target.id)));
      const [updated] = await db
        .update(userEmails)
        .set({ isPreferred: true })
        .where(eq(userEmails.id, target.id))
        .returning();

      return reply.send(toPublicEmail(updated));
    },
  );

  app.post(
    "/api/auth/sessions/revoke-others",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const currentRefreshToken = readRefreshToken(request);
      await revokeOtherSessions(request.user.sub, currentRefreshToken);
      return reply.send({ ok: true });
    },
  );

  app.post(
    "/api/users/me/deactivate",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      await db
        .update(users)
        .set({ deactivatedAt: new Date() })
        .where(eq(users.id, request.user.sub));
      await revokeAllSessions(request.user.sub);
      clearSessionCookies(reply);
      return reply.send({ ok: true });
    },
  );

  app.delete(
    "/api/users/me",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      // No workspace-membership model exists yet (that's Sprint 4), so an owned workspace
      // has no other members to reassign it to — deleting the account deletes it too.
      await db.delete(sessions).where(eq(sessions.userId, request.user.sub));
      await db.delete(userEmails).where(eq(userEmails.userId, request.user.sub));
      await db.delete(workspaces).where(eq(workspaces.ownerId, request.user.sub));
      await db.delete(users).where(eq(users.id, request.user.sub));
      clearSessionCookies(reply);
      return reply.send({ ok: true });
    },
  );
};
