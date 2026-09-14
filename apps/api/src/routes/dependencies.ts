import { and, eq, or } from "drizzle-orm";
import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { createTaskDependencySchema, type TaskDependencies } from "@asanaClone/shared";
import { db } from "../db";
import { taskDependencies, tasks } from "../db/schema";
import { requireTaskAccess } from "../lib/taskAccess";

const taskIdParamsSchema = z.object({ id: z.coerce.number() });
const dependencyParamsSchema = z.object({ id: z.coerce.number(), dependencyId: z.coerce.number() });

export const dependenciesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/api/tasks/:id/dependencies",
    {
      schema: { params: taskIdParamsSchema, body: createTaskDependencySchema },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const access = await requireTaskAccess(request.params.id, request.user.sub);
      if (!access) {
        return reply.status(404).send({ error: "Task not found" });
      }
      if (request.body.dependsOnTaskId === access.task.id) {
        return reply.status(400).send({ error: "A task can't depend on itself" });
      }
      const otherAccess = await requireTaskAccess(request.body.dependsOnTaskId, request.user.sub);
      if (!otherAccess) {
        return reply.status(404).send({ error: "That task wasn't found" });
      }

      const existing = await db.query.taskDependencies.findFirst({
        where: and(
          eq(taskDependencies.taskId, access.task.id),
          eq(taskDependencies.dependsOnTaskId, request.body.dependsOnTaskId),
        ),
      });
      if (existing) {
        return reply.status(409).send({ error: "That dependency already exists" });
      }

      await db.insert(taskDependencies).values({
        taskId: access.task.id,
        dependsOnTaskId: request.body.dependsOnTaskId,
      });

      return reply.status(201).send({ ok: true });
    },
  );

  app.get(
    "/api/tasks/:id/dependencies",
    { schema: { params: taskIdParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const access = await requireTaskAccess(request.params.id, request.user.sub);
      if (!access) {
        return reply.status(404).send({ error: "Task not found" });
      }

      const rows = await db
        .select({ dependency: taskDependencies, task: tasks })
        .from(taskDependencies)
        .innerJoin(
          tasks,
          or(
            and(eq(taskDependencies.taskId, access.task.id), eq(tasks.id, taskDependencies.dependsOnTaskId)),
            and(eq(taskDependencies.dependsOnTaskId, access.task.id), eq(tasks.id, taskDependencies.taskId)),
          ),
        )
        .where(
          or(
            eq(taskDependencies.taskId, access.task.id),
            eq(taskDependencies.dependsOnTaskId, access.task.id),
          ),
        );

      const result: TaskDependencies = { blockedBy: [], blocking: [] };
      for (const row of rows) {
        const ref = {
          dependencyId: row.dependency.id,
          task: { id: row.task.id, title: row.task.title, completed: row.task.completed },
        };
        if (row.dependency.taskId === access.task.id) {
          result.blockedBy.push(ref);
        } else {
          result.blocking.push(ref);
        }
      }

      return reply.send(result);
    },
  );

  app.delete(
    "/api/tasks/:id/dependencies/:dependencyId",
    { schema: { params: dependencyParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const access = await requireTaskAccess(request.params.id, request.user.sub);
      if (!access) {
        return reply.status(404).send({ error: "Task not found" });
      }

      const dependency = await db.query.taskDependencies.findFirst({
        where: eq(taskDependencies.id, request.params.dependencyId),
      });
      if (
        !dependency ||
        (dependency.taskId !== access.task.id && dependency.dependsOnTaskId !== access.task.id)
      ) {
        return reply.status(404).send({ error: "Dependency not found" });
      }

      await db.delete(taskDependencies).where(eq(taskDependencies.id, dependency.id));

      return reply.send({ ok: true });
    },
  );
};
