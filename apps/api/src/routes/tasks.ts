import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  createTaskSchema,
  moveTaskSchema,
  setMilestoneSchema,
  updateTaskSchema,
  type ActivityType,
  type Task,
  type TaskCard,
  type TaskCustomField,
  type TaskDetail,
} from "@asanaClone/shared";
import { db } from "../db";
import {
  activityLog,
  customFields,
  customFieldValues,
  projects,
  sections,
  taskFollowers,
  taskProjects,
  tasks,
  users,
} from "../db/schema";
import { getMembership } from "../policies/workspaceAccess";
import { requireProjectAccess } from "../policies/projectAccess";
import { requireTaskAccess } from "../policies/taskAccess";
import { deleteTaskFully } from "../services/taskDelete";
import { createNotification, notifyFollowers } from "../services/notifications";

const projectIdParamsSchema = z.object({ id: z.coerce.number() });
const taskIdParamsSchema = z.object({ id: z.coerce.number() });
const taskProjectParamsSchema = z.object({ id: z.coerce.number(), projectId: z.coerce.number() });

function toPublicTask(row: typeof tasks.$inferSelect): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    completed: row.completed,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    dueDateStart: row.dueDateStart ? row.dueDateStart.toISOString() : null,
    dueDateEnd: row.dueDateEnd ? row.dueDateEnd.toISOString() : null,
    assigneeId: row.assigneeId,
    createdBy: row.createdBy,
    parentTaskId: row.parentTaskId,
    isMilestone: row.isMilestone,
    createdAt: row.createdAt.toISOString(),
  };
}

async function loadTaskDetail(taskId: number): Promise<TaskDetail> {
  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
  if (!task) {
    throw new Error("Task not found");
  }

  const assignee = task.assigneeId
    ? await db.query.users.findFirst({ where: eq(users.id, task.assigneeId) })
    : null;

  const projectLinks = await db
    .select({ link: taskProjects, project: projects, section: sections })
    .from(taskProjects)
    .innerJoin(projects, eq(taskProjects.projectId, projects.id))
    .innerJoin(sections, eq(taskProjects.sectionId, sections.id))
    .where(eq(taskProjects.taskId, taskId));

  const followerRows = await db
    .select({ user: users })
    .from(taskFollowers)
    .innerJoin(users, eq(taskFollowers.userId, users.id))
    .where(eq(taskFollowers.taskId, taskId));

  const projectRefs = await Promise.all(
    projectLinks.map(async (row) => {
      const fields = await db
        .select()
        .from(customFields)
        .where(eq(customFields.projectId, row.project.id));

      const values = await db
        .select()
        .from(customFieldValues)
        .where(
          and(eq(customFieldValues.taskId, taskId), eq(customFieldValues.projectId, row.project.id)),
        );
      const valueByFieldId = new Map(values.map((v) => [v.customFieldId, v.value]));

      const customFieldEntries: TaskCustomField[] = fields.map((field) => ({
        field: {
          id: field.id,
          projectId: field.projectId,
          name: field.name,
          type: field.type,
          options: field.options ?? null,
          createdAt: field.createdAt.toISOString(),
        },
        value: valueByFieldId.get(field.id) ?? null,
      }));

      return {
        projectId: row.project.id,
        projectName: row.project.name,
        sectionId: row.section.id,
        sectionName: row.section.name,
        customFields: customFieldEntries,
      };
    }),
  );

  return {
    ...toPublicTask(task),
    assignee: assignee ? { id: assignee.id, name: assignee.name, email: assignee.email } : null,
    projects: projectRefs,
    followers: followerRows.map((row) => ({
      id: row.user.id,
      name: row.user.name,
      email: row.user.email,
    })),
  };
}

async function addFollower(taskId: number, userId: number) {
  await db.insert(taskFollowers).values({ taskId, userId }).onConflictDoNothing();
}

async function logActivity(
  taskId: number,
  actorId: number,
  type: ActivityType,
  metadata?: Record<string, unknown>,
) {
  await db.insert(activityLog).values({ taskId, actorId, type, metadata: metadata ?? null });
}

// Renumber every task_projects row in (projectId, sectionId) to sequential
// positions matching their current position order.
async function renumberSection(projectId: number, sectionId: number) {
  const rows = await db
    .select()
    .from(taskProjects)
    .where(and(eq(taskProjects.projectId, projectId), eq(taskProjects.sectionId, sectionId)))
    .orderBy(asc(taskProjects.position));

  await Promise.all(
    rows.map((row, index) =>
      row.position === index
        ? Promise.resolve()
        : db.update(taskProjects).set({ position: index }).where(eq(taskProjects.id, row.id)),
    ),
  );
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

      const section = await db.query.sections.findFirst({
        where: and(eq(sections.id, request.body.sectionId), eq(sections.projectId, project.id)),
      });
      if (!section) {
        return reply.status(400).send({ error: "Section does not belong to that project" });
      }

      const [task] = await db
        .insert(tasks)
        .values({ title: request.body.title, createdBy: request.user.sub })
        .returning();

      const existing = await db
        .select()
        .from(taskProjects)
        .where(and(eq(taskProjects.projectId, project.id), eq(taskProjects.sectionId, section.id)));
      const nextPosition =
        existing.length === 0 ? 0 : Math.max(...existing.map((row) => row.position)) + 1;

      await db.insert(taskProjects).values({
        taskId: task.id,
        projectId: project.id,
        sectionId: section.id,
        position: nextPosition,
      });

      await addFollower(task.id, request.user.sub);

      return reply.status(201).send(await loadTaskDetail(task.id));
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

      const rows = await db
        .select({ link: taskProjects, task: tasks, assignee: users })
        .from(taskProjects)
        .innerJoin(tasks, eq(taskProjects.taskId, tasks.id))
        .leftJoin(users, eq(tasks.assigneeId, users.id))
        .where(eq(taskProjects.projectId, project.id))
        .orderBy(asc(taskProjects.position));

      const values = await db
        .select()
        .from(customFieldValues)
        .where(eq(customFieldValues.projectId, project.id));
      const valuesByTaskId = new Map<number, typeof values>();
      for (const value of values) {
        const list = valuesByTaskId.get(value.taskId) ?? [];
        list.push(value);
        valuesByTaskId.set(value.taskId, list);
      }

      const cards: TaskCard[] = rows.map((row) => ({
        id: row.task.id,
        title: row.task.title,
        completed: row.task.completed,
        dueDateStart: row.task.dueDateStart ? row.task.dueDateStart.toISOString() : null,
        dueDateEnd: row.task.dueDateEnd ? row.task.dueDateEnd.toISOString() : null,
        sectionId: row.link.sectionId,
        position: row.link.position,
        assignee: row.assignee
          ? { id: row.assignee.id, name: row.assignee.name, email: row.assignee.email }
          : null,
        isMilestone: row.task.isMilestone,
        customFieldValues: (valuesByTaskId.get(row.task.id) ?? []).map((value) => ({
          customFieldId: value.customFieldId,
          value: value.value,
        })),
      }));

      return reply.send(cards);
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

      const body = request.body;

      if (body.assigneeId !== undefined && body.assigneeId !== null) {
        const workspaceIds = access.links.map(({ project }) => project.workspaceId);
        let assigneeIsMember = false;
        for (const workspaceId of workspaceIds) {
          if (await getMembership(workspaceId, body.assigneeId)) {
            assigneeIsMember = true;
            break;
          }
        }
        if (!assigneeIsMember) {
          return reply.status(400).send({ error: "Assignee isn't a member of this task's workspace" });
        }
      }

      const before = access.task;
      const updates: Partial<typeof tasks.$inferInsert> = {};
      if (body.title !== undefined) updates.title = body.title;
      if (body.description !== undefined) updates.description = body.description;
      if (body.assigneeId !== undefined) updates.assigneeId = body.assigneeId;
      if (body.dueDateStart !== undefined) {
        updates.dueDateStart = body.dueDateStart ? new Date(body.dueDateStart) : null;
      }
      if (body.dueDateEnd !== undefined) {
        updates.dueDateEnd = body.dueDateEnd ? new Date(body.dueDateEnd) : null;
      }
      if (body.completed !== undefined) {
        updates.completed = body.completed;
        updates.completedAt = body.completed ? new Date() : null;
      }

      if (Object.keys(updates).length > 0) {
        await db.update(tasks).set(updates).where(eq(tasks.id, access.task.id));
      }

      const primaryProjectId = access.links[0]?.project.id ?? null;

      if (body.assigneeId !== undefined && body.assigneeId !== before.assigneeId) {
        await logActivity(access.task.id, request.user.sub, "assignee_changed", {
          from: before.assigneeId,
          to: body.assigneeId,
        });
        if (body.assigneeId !== null) {
          await addFollower(access.task.id, body.assigneeId);
          await createNotification({
            userId: body.assigneeId,
            type: "assigned",
            actorId: request.user.sub,
            taskId: access.task.id,
            projectId: primaryProjectId,
          });
        }
      }

      const beforeStart = before.dueDateStart ? before.dueDateStart.toISOString() : null;
      const beforeEnd = before.dueDateEnd ? before.dueDateEnd.toISOString() : null;
      const afterStart = updates.dueDateStart !== undefined ? body.dueDateStart : undefined;
      const afterEnd = updates.dueDateEnd !== undefined ? body.dueDateEnd : undefined;
      if (
        (afterStart !== undefined && (afterStart || null) !== beforeStart) ||
        (afterEnd !== undefined && (afterEnd || null) !== beforeEnd)
      ) {
        await logActivity(access.task.id, request.user.sub, "due_date_changed", {
          from: { start: beforeStart, end: beforeEnd },
          to: {
            start: afterStart !== undefined ? afterStart || null : beforeStart,
            end: afterEnd !== undefined ? afterEnd || null : beforeEnd,
          },
        });
        if (primaryProjectId !== null) {
          await notifyFollowers({
            taskId: access.task.id,
            projectId: primaryProjectId,
            type: "due_date_changed",
            actorId: request.user.sub,
          });
        }
      }

      if (body.completed !== undefined && body.completed !== before.completed) {
        await logActivity(access.task.id, request.user.sub, body.completed ? "completed" : "reopened");
        if (body.completed && primaryProjectId !== null) {
          await notifyFollowers({
            taskId: access.task.id,
            projectId: primaryProjectId,
            type: "completed",
            actorId: request.user.sub,
          });
        }
      }

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

      const targetSection = await db.query.sections.findFirst({
        where: and(
          eq(sections.id, request.body.sectionId),
          eq(sections.projectId, targetProject.id),
        ),
      });
      if (!targetSection) {
        return reply.status(400).send({ error: "Section does not belong to that project" });
      }

      const existingLink = await db.query.taskProjects.findFirst({
        where: and(
          eq(taskProjects.taskId, access.task.id),
          eq(taskProjects.projectId, targetProject.id),
        ),
      });
      const oldSectionId = existingLink?.sectionId ?? null;
      const leavingASection = oldSectionId !== null && oldSectionId !== request.body.sectionId;

      if (existingLink) {
        await db
          .update(taskProjects)
          .set({ sectionId: request.body.sectionId })
          .where(eq(taskProjects.id, existingLink.id));
      } else {
        await db.insert(taskProjects).values({
          taskId: access.task.id,
          projectId: targetProject.id,
          sectionId: request.body.sectionId,
          position: 0,
        });
      }

      const destRows = await db
        .select()
        .from(taskProjects)
        .where(
          and(
            eq(taskProjects.projectId, targetProject.id),
            eq(taskProjects.sectionId, request.body.sectionId),
          ),
        );
      const others = destRows
        .filter((row) => row.taskId !== access.task.id)
        .sort((a, b) => a.position - b.position);
      const thisRow = destRows.find((row) => row.taskId === access.task.id);
      if (!thisRow) {
        return reply.status(500).send({ error: "Failed to place task" });
      }
      const clampedIndex = Math.max(0, Math.min(request.body.position, others.length));
      const ordered = [...others.slice(0, clampedIndex), thisRow, ...others.slice(clampedIndex)];

      await Promise.all(
        ordered.map((row, index) =>
          row.position === index
            ? Promise.resolve()
            : db.update(taskProjects).set({ position: index }).where(eq(taskProjects.id, row.id)),
        ),
      );

      if (leavingASection && oldSectionId !== null) {
        await renumberSection(targetProject.id, oldSectionId);
        await logActivity(access.task.id, request.user.sub, "section_changed", {
          projectId: targetProject.id,
          from: oldSectionId,
          to: request.body.sectionId,
        });
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
