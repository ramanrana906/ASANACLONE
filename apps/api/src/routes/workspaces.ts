import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { createWorkspaceSchema, updateWorkspaceSchema, type Workspace } from "@asanaClone/shared";
import { db } from "../db";
import { workspaces } from "../db/schema";

const workspaceIdParamsSchema = z.object({ id: z.coerce.number() });

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

      return reply.status(201).send(toPublicWorkspace(workspace));
    },
  );

  app.get(
    "/api/workspaces",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      // No membership model yet (Sprint 4) — "mine" means owned, for now.
      const rows = await db.query.workspaces.findMany({
        where: eq(workspaces.ownerId, request.user.sub),
      });
      return reply.send(rows.map(toPublicWorkspace));
    },
  );

  app.get(
    "/api/workspaces/:id",
    { schema: { params: workspaceIdParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const workspace = await db.query.workspaces.findFirst({
        where: and(eq(workspaces.id, request.params.id), eq(workspaces.ownerId, request.user.sub)),
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
      const [workspace] = await db
        .update(workspaces)
        .set({ name: request.body.name })
        .where(and(eq(workspaces.id, request.params.id), eq(workspaces.ownerId, request.user.sub)))
        .returning();

      if (!workspace) {
        return reply.status(404).send({ error: "Workspace not found" });
      }
      return reply.send(toPublicWorkspace(workspace));
    },
  );

  app.delete(
    "/api/workspaces/:id",
    { schema: { params: workspaceIdParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const [deleted] = await db
        .delete(workspaces)
        .where(and(eq(workspaces.id, request.params.id), eq(workspaces.ownerId, request.user.sub)))
        .returning();

      if (!deleted) {
        return reply.status(404).send({ error: "Workspace not found" });
      }
      return reply.send({ ok: true });
    },
  );
};
