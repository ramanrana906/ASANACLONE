import { eq } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { MyTask } from "@asanaClone/shared";
import { db } from "../db";
import { projects, sections, taskProjects, tasks } from "../db/schema";

export const meRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/api/me/tasks", { preHandler: [app.authenticate] }, async (request, reply) => {
    const rows = await db
      .select({ task: tasks, link: taskProjects, project: projects, section: sections })
      .from(tasks)
      .innerJoin(taskProjects, eq(taskProjects.taskId, tasks.id))
      .innerJoin(projects, eq(taskProjects.projectId, projects.id))
      .innerJoin(sections, eq(taskProjects.sectionId, sections.id))
      .where(eq(tasks.assigneeId, request.user.sub));

    const seen = new Set<number>();
    const myTasks: MyTask[] = [];
    for (const row of rows) {
      if (seen.has(row.task.id)) continue;
      seen.add(row.task.id);
      myTasks.push({
        id: row.task.id,
        title: row.task.title,
        completed: row.task.completed,
        dueDateStart: row.task.dueDateStart ? row.task.dueDateStart.toISOString() : null,
        dueDateEnd: row.task.dueDateEnd ? row.task.dueDateEnd.toISOString() : null,
        isMilestone: row.task.isMilestone,
        projectId: row.project.id,
        projectName: row.project.name,
        sectionId: row.section.id,
        sectionName: row.section.name,
      });
    }

    myTasks.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const aDue = a.dueDateStart ?? "";
      const bDue = b.dueDateStart ?? "";
      if (!aDue && bDue) return 1;
      if (aDue && !bDue) return -1;
      return aDue.localeCompare(bDue);
    });

    return reply.send(myTasks);
  });
};
