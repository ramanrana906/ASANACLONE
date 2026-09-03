import { eq } from "drizzle-orm";
import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  updateMemberRoleSchema,
  type Workspace,
  type WorkspaceMember,
} from "@asanaClone/shared";
import { db } from "../db";
import { users, workspaceMembers, workspaces } from "../db/schema";
import { getMembership } from "../lib/workspaceAccess";

const workspaceIdParamsSchema = z.object({ id: z.coerce.number() });
const memberParamsSchema = z.object({ id: z.coerce.number(), userId: z.coerce.number() });

function toPublicWorkspace(row: typeof workspaces.$inferSelect): Workspace {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.ownerId,
    createdAt: row.createdAt.toISOString(),
  };
}

export const workspacesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/api/workspaces",
    { schema: { body: createWorkspaceSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const [workspace] = await db
        .insert(workspaces)
        .values({ name: request.body.name, ownerId: request.user.sub })
        .returning();

      await db.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId: request.user.sub,
        role: "admin",
      });

      return reply.status(201).send(toPublicWorkspace(workspace));
    },
  );

  app.get(
    "/api/workspaces",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const rows = await db
        .select({ workspace: workspaces })
        .from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
        .where(eq(workspaceMembers.userId, request.user.sub));

      return reply.send(rows.map((row) => toPublicWorkspace(row.workspace)));
    },
  );

  app.get(
    "/api/workspaces/:id",
    { schema: { params: workspaceIdParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const membership = await getMembership(request.params.id, request.user.sub);
      if (!membership) {
        return reply.status(404).send({ error: "Workspace not found" });
      }

      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, request.params.id),
      });
      if (!workspace) {
        return reply.status(404).send({ error: "Workspace not found" });
      }
      return reply.send(toPublicWorkspace(workspace));
    },
  );

  app.patch(
    "/api/workspaces/:id",
    {
      schema: { params: workspaceIdParamsSchema, body: updateWorkspaceSchema },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const membership = await getMembership(request.params.id, request.user.sub);
      if (!membership) {
        return reply.status(404).send({ error: "Workspace not found" });
      }
      if (membership.role !== "admin") {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const [workspace] = await db
        .update(workspaces)
        .set({ name: request.body.name })
        .where(eq(workspaces.id, request.params.id))
        .returning();

      return reply.send(toPublicWorkspace(workspace));
    },
  );

  app.delete(
    "/api/workspaces/:id",
    { schema: { params: workspaceIdParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, request.params.id),
      });
      if (!workspace || workspace.ownerId !== request.user.sub) {
        return reply.status(404).send({ error: "Workspace not found" });
      }

      await db.delete(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspace.id));
      await db.delete(workspaces).where(eq(workspaces.id, workspace.id));
      return reply.send({ ok: true });
    },
  );

  app.get(
    "/api/workspaces/:id/members",
    { schema: { params: workspaceIdParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const membership = await getMembership(request.params.id, request.user.sub);
      if (!membership) {
        return reply.status(404).send({ error: "Workspace not found" });
      }

      const rows = await db
        .select({ member: workspaceMembers, user: users })
        .from(workspaceMembers)
        .innerJoin(users, eq(workspaceMembers.userId, users.id))
        .where(eq(workspaceMembers.workspaceId, request.params.id));

      const members: WorkspaceMember[] = rows.map((row) => ({
        userId: row.user.id,
        workspaceId: row.member.workspaceId,
        role: row.member.role,
        name: row.user.name,
        email: row.user.email,
        photoUrl: row.user.photoUrl,
        createdAt: row.member.createdAt.toISOString(),
      }));

      return reply.send(members);
    },
  );

  app.patch(
    "/api/workspaces/:id/members/:userId",
    {
      schema: { params: memberParamsSchema, body: updateMemberRoleSchema },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const membership = await getMembership(request.params.id, request.user.sub);
      if (!membership) {
        return reply.status(404).send({ error: "Workspace not found" });
      }
      if (membership.role !== "admin") {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, request.params.id),
      });
      if (workspace?.ownerId === request.params.userId) {
        return reply.status(400).send({ error: "Can't change the workspace owner's role" });
      }

      const target = await getMembership(request.params.id, request.params.userId);
      if (!target) {
        return reply.status(404).send({ error: "Member not found" });
      }

      await db
        .update(workspaceMembers)
        .set({ role: request.body.role })
        .where(eq(workspaceMembers.id, target.id));

      return reply.send({ ok: true });
    },
  );

  app.delete(
    "/api/workspaces/:id/members/:userId",
    { schema: { params: memberParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const membership = await getMembership(request.params.id, request.user.sub);
      if (!membership) {
        return reply.status(404).send({ error: "Workspace not found" });
      }
      if (membership.role !== "admin") {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, request.params.id),
      });
      if (workspace?.ownerId === request.params.userId) {
        return reply.status(400).send({ error: "Can't remove the workspace owner" });
      }

      const target = await getMembership(request.params.id, request.params.userId);
      if (!target) {
        return reply.status(404).send({ error: "Member not found" });
      }

      await db.delete(workspaceMembers).where(eq(workspaceMembers.id, target.id));
      return reply.send({ ok: true });
    },
  );
};
