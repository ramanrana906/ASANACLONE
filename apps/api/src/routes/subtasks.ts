import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { createSubtaskSchema, type Subtask } from "@asanaClone/shared";
import { db } from "../db";
import { tasks } from "../db/schema";
import { requireTaskAccess } from "../lib/taskAccess";

const taskIdParamsSchema = z.object({ id: z.coerce.number() });

function toPublicSubtask(row: typeof tasks.$inferSelect): Subtask {
  return { id: row.id, title: row.title, completed: row.completed };
}

export const subtasksRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/api/tasks/:id/subtasks",
    {
      schema: { params: taskIdParamsSchema, body: createSubtaskSchema },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const access = await requireTaskAccess(request.params.id, request.user.sub);
      if (!access) {
        return reply.status(404).send({ error: "Task not found" });
      }
      if (access.task.parentTaskId) {
        return reply.status(400).send({ error: "A subtask can't have its own subtasks" });
      }

      const [subtask] = await db
        .insert(tasks)
        .values({
          title: request.body.title,
          createdBy: request.user.sub,
          parentTaskId: access.task.id,
        })
        .returning();

      return reply.status(201).send(toPublicSubtask(subtask));
    },
  );

  app.get(
    "/api/tasks/:id/subtasks",
    { schema: { params: taskIdParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const access = await requireTaskAccess(request.params.id, request.user.sub);
      if (!access) {
        return reply.status(404).send({ error: "Task not found" });
      }

      const rows = await db
        .select()
        .from(tasks)
        .where(eq(tasks.parentTaskId, access.task.id))
        .orderBy(asc(tasks.createdAt));

      return reply.send(rows.map(toPublicSubtask));
    },
  );
};
