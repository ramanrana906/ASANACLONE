import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { addFollowerSchema } from "@asanaClone/shared";
import { db } from "../db";
import { taskFollowers } from "../db/schema";
import { getMembership } from "../lib/workspaceAccess";
import { requireTaskAccess } from "../lib/taskAccess";

const taskIdParamsSchema = z.object({ id: z.coerce.number() });
const taskFollowerParamsSchema = z.object({ id: z.coerce.number(), userId: z.coerce.number() });

export const followersRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/api/tasks/:id/followers",
    {
      schema: { params: taskIdParamsSchema, body: addFollowerSchema },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const access = await requireTaskAccess(request.params.id, request.user.sub);
      if (!access) {
        return reply.status(404).send({ error: "Task not found" });
      }

      const workspaceIds = access.links.map(({ project }) => project.workspaceId);
      let targetIsMember = false;
      for (const workspaceId of workspaceIds) {
        if (await getMembership(workspaceId, request.body.userId)) {
          targetIsMember = true;
          break;
        }
      }
      if (!targetIsMember) {
        return reply.status(400).send({ error: "That person isn't a member of this task's workspace" });
      }

      await db
        .insert(taskFollowers)
        .values({ taskId: access.task.id, userId: request.body.userId })
        .onConflictDoNothing();

      return reply.status(201).send({ ok: true });
    },
  );

  app.delete(
    "/api/tasks/:id/followers/:userId",
    { schema: { params: taskFollowerParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const access = await requireTaskAccess(request.params.id, request.user.sub);
      if (!access) {
        return reply.status(404).send({ error: "Task not found" });
      }

      await db
        .delete(taskFollowers)
        .where(
          and(
            eq(taskFollowers.taskId, access.task.id),
            eq(taskFollowers.userId, request.params.userId),
          ),
        );

      return reply.send({ ok: true });
    },
  );
};
