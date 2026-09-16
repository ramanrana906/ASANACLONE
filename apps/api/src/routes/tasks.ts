import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  createTaskSchema,
  moveTaskSchema,
  setMilestoneSchema,
  updateTaskSchema,
  type TaskCard,
} from "@asanaClone/shared";
import { db } from "../db";
import { customFieldValues, sections, taskProjects, tasks, users } from "../db/schema";
import { getMembership } from "../policies/workspaceAccess";
import { requireProjectAccess } from "../policies/projectAccess";
import { requireTaskAccess } from "../policies/taskAccess";
import { deleteTaskFully } from "../services/taskDelete";
import { addFollower, loadTaskDetail, logActivity, renumberSection, createTask, getProjectTasks, moveTask, updateTask } from "../services/taskService";

const projectIdParamsSchema = z.object({ id: z.coerce.number() });
const taskIdParamsSchema = z.object({ id: z.coerce.number() });
const taskProjectParamsSchema = z.object({ id: z.coerce.number(), projectId: z.coerce.number() });

async function findSection(sectionId: number, projectId: number) {
  return db.query.sections.findFirst({
    where: and(eq(sections.id, sectionId), eq(sections.projectId, projectId)),
  });
}

export const tasksRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/api/tasks",
    { schema: { body: createTaskSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const project = await requireProjectAccess(request.body.projectId, request.user.sub);
      if (!project) {
        return reply.status(404).send({ error: "Project not found" });
      }

      const section = await findSection(request.body.sectionId, project.id);
      if (!section) {
        return reply.status(400).send({ error: "Section does not belong to that project" });
      }

      const result = await createTask(request.body.title, project.id, section.id,request.user.sub );
      return reply.status(201).send(result.taskDetails);
    },
  );

  app.get(
    "/api/projects/:id/tasks",
    { schema: { params: projectIdParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const project = await requireProjectAccess(request.params.id, request.user.sub);
      if (!project) {
        return reply.status(404).send({ error: "Project not found" });
      }
      const result = await getProjectTasks( project.id);
      return reply.send(result);
    },
  );

  app.get(
    "/api/tasks/:id",
    { schema: { params: taskIdParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const access = await requireTaskAccess(request.params.id, request.user.sub);
      if (!access) {
        return reply.status(404).send({ error: "Task not found" });
      }

      return reply.send(await loadTaskDetail(access.task.id));
    },
  );

  app.patch(
    "/api/tasks/:id",
    { schema: { params: taskIdParamsSchema, body: updateTaskSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const access = await requireTaskAccess(request.params.id, request.user.sub);
      if (!access) {
        return reply.status(404).send({ error: "Task not found" });
      }

    await updateTask(access.task.id, request.user.sub, request.body);

      return reply.send(await loadTaskDetail(access.task.id));
    },
  );

  app.delete(
    "/api/tasks/:id",
    { schema: { params: taskIdParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const access = await requireTaskAccess(request.params.id, request.user.sub);
      if (!access) {
        return reply.status(404).send({ error: "Task not found" });
      }

      await deleteTaskFully(access.task.id);

      return reply.send({ ok: true });
    },
  );

  app.patch(
    "/api/tasks/:id/move",
    { schema: { params: taskIdParamsSchema, body: moveTaskSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const access = await requireTaskAccess(request.params.id, request.user.sub);
      if (!access) {
        return reply.status(404).send({ error: "Task not found" });
      }

      const targetProject = await requireProjectAccess(request.body.projectId, request.user.sub);
      if (!targetProject) {
        return reply.status(404).send({ error: "Project not found" });
      }

      const result = await moveTask(request.params.id, request.body.projectId, request.body.sectionId, request.body.position, request.user.sub);
      if (result.error) {
        return reply.status(400).send({ error: result.error });
      } 

       return reply.send(await loadTaskDetail(access.task.id));
      

    },
  );

  app.delete(
    "/api/tasks/:id/projects/:projectId",
    { schema: { params: taskProjectParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const access = await requireTaskAccess(request.params.id, request.user.sub);
      if (!access) {
        return reply.status(404).send({ error: "Task not found" });
      }

      if (access.links.length <= 1) {
        return reply.status(400).send({ error: "A task must belong to at least one project" });
      }

      const link = access.links.find(({ link }) => link.projectId === request.params.projectId);
      if (!link) {
        return reply.status(404).send({ error: "Task isn't in that project" });
      }

      await db.delete(taskProjects).where(eq(taskProjects.id, link.link.id));
      await renumberSection(link.link.projectId, link.link.sectionId);

      return reply.send(await loadTaskDetail(access.task.id));
    },
  );

  app.patch(
    "/api/tasks/:id/milestone",
    {
      schema: { params: taskIdParamsSchema, body: setMilestoneSchema },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const access = await requireTaskAccess(request.params.id, request.user.sub);
      if (!access) {
        return reply.status(404).send({ error: "Task not found" });
      }

      await db
        .update(tasks)
        .set({ isMilestone: request.body.isMilestone })
        .where(eq(tasks.id, access.task.id));

      return reply.send(await loadTaskDetail(access.task.id));
    },
  );
};
