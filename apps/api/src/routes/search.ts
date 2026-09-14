import { and, eq, ilike } from "drizzle-orm";
import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { SearchResults } from "@asanaClone/shared";
import { db } from "../db";
import { projects, taskProjects, tasks } from "../db/schema";
import { getMembership } from "../lib/workspaceAccess";

const searchQuerySchema = z.object({
  workspaceId: z.coerce.number(),
  q: z.string().min(1).max(200),
});

const RESULT_LIMIT = 8;

export const searchRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/api/search",
    { schema: { querystring: searchQuerySchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const { workspaceId, q } = request.query;
      const membership = await getMembership(workspaceId, request.user.sub);
      if (!membership) {
        return reply.status(404).send({ error: "Workspace not found" });
      }

      const needle = `%${q}%`;

      const projectRows = await db
        .select()
        .from(projects)
        .where(and(eq(projects.workspaceId, workspaceId), ilike(projects.name, needle)))
        .limit(RESULT_LIMIT);

      const taskRows = await db
        .select({ task: tasks, project: projects })
        .from(taskProjects)
        .innerJoin(tasks, eq(taskProjects.taskId, tasks.id))
        .innerJoin(projects, eq(taskProjects.projectId, projects.id))
        .where(and(eq(projects.workspaceId, workspaceId), ilike(tasks.title, needle)))
        .limit(RESULT_LIMIT);

      const results: SearchResults = {
        projects: projectRows.map((project) => ({ id: project.id, name: project.name })),
        tasks: taskRows.map((row) => ({
          id: row.task.id,
          title: row.task.title,
          completed: row.task.completed,
          projectId: row.project.id,
          projectName: row.project.name,
        })),
      };

      return reply.send(results);
    },
  );
};
