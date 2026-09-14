import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { ActivityEntry } from "@asanaClone/shared";
import { db } from "../db";
import { activityLog, users } from "../db/schema";
import { requireTaskAccess } from "../lib/taskAccess";

const taskIdParamsSchema = z.object({ id: z.coerce.number() });

export const activityRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/api/tasks/:id/activity",
    { schema: { params: taskIdParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const access = await requireTaskAccess(request.params.id, request.user.sub);
      if (!access) {
        return reply.status(404).send({ error: "Task not found" });
      }

      const rows = await db
        .select({ entry: activityLog, actor: users })
        .from(activityLog)
        .innerJoin(users, eq(activityLog.actorId, users.id))
        .where(eq(activityLog.taskId, access.task.id))
        .orderBy(asc(activityLog.createdAt));

      const result: ActivityEntry[] = rows.map((row) => ({
        id: row.entry.id,
        taskId: row.entry.taskId,
        actor: { id: row.actor.id, name: row.actor.name, email: row.actor.email },
        type: row.entry.type,
        metadata: row.entry.metadata,
        createdAt: row.entry.createdAt.toISOString(),
      }));

      return reply.send(result);
    },
  );
};
