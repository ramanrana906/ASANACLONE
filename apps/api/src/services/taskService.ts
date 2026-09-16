import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import {
  type ActivityType,
  type Task,
  type TaskCustomField,
  type TaskDetail,
  type TaskCard,
  type  updateTaskSchema,
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
import { request } from "http";
import { createNotification, notifyFollowers } from "../services/notifications";


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



export async function loadTaskDetail(taskId: number): Promise<TaskDetail> {
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


export async function addFollower(taskId: number, userId: number) {
  await db.insert(taskFollowers).values({ taskId, userId }).onConflictDoNothing();
}


export async function logActivity(
  taskId: number,
  actorId: number,
  type: ActivityType,
  metadata?: Record<string, unknown>,
) {
  await db.insert(activityLog).values({ taskId, actorId, type, metadata: metadata ?? null });
}


// Renumber every task_projects row in (projectId, sectionId) to sequential
// positions matching their current position order.
export async function renumberSection(projectId: number, sectionId: number) {
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
export async function createTask(title: string, projectId: number, sectionId: number, userId: number) {
  const [task] = await db
    .insert(tasks)
    .values({ title, createdBy: userId })
    .returning();

  const existing = await db
    .select()
    .from(taskProjects)
    .where(and(eq(taskProjects.projectId, projectId), eq(taskProjects.sectionId, sectionId)));
  const nextPosition =
    existing.length === 0 ? 0 : Math.max(...existing.map((row) => row.position)) + 1;

  await db.insert(taskProjects).values({
    taskId: task.id,
    projectId: projectId,
    sectionId: sectionId,
    position: nextPosition,
  });

  await addFollower(task.id, userId);

  return { task, taskDetails: await loadTaskDetail(task.id) };
}



export async function getProjectTasks(projectId: number) {

  const rows = await db
    .select({ link: taskProjects, task: tasks, assignee: users })
    .from(taskProjects)
    .innerJoin(tasks, eq(taskProjects.taskId, tasks.id))
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(eq(taskProjects.projectId, projectId))
    .orderBy(asc(taskProjects.position));

  const values = await db
    .select()
    .from(customFieldValues)
    .where(eq(customFieldValues.projectId, projectId));
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

  return cards;
}


export async function moveTask(taskId: number, projectId: number, sectionId: number, position: number, userId: number) {
  const targetSection = await db.query.sections.findFirst({
    where: and(
      eq(sections.id, sectionId),
      eq(sections.projectId, projectId),
    ),
  });
  if (!targetSection) {
    return { error: "Section does not belong to that project" };
  }

  const existingLink = await db.query.taskProjects.findFirst({
    where: and(
      eq(taskProjects.taskId, taskId),
      eq(taskProjects.projectId, projectId),
    ),
  });
  const oldSectionId = existingLink?.sectionId ?? null;
  const leavingASection = oldSectionId !== null && oldSectionId !== sectionId;

  if (existingLink) {
    await db
      .update(taskProjects)
      .set({ sectionId: sectionId })
      .where(eq(taskProjects.id, existingLink.id));
  } else {
    await db.insert(taskProjects).values({
      taskId: taskId,
      projectId: projectId,
      sectionId: sectionId,
      position: 0,
    });
  }

  const destRows = await db
    .select()
    .from(taskProjects)
    .where(
      and(
        eq(taskProjects.projectId, projectId),
        eq(taskProjects.sectionId, sectionId),
      ),
    );
  const others = destRows
    .filter((row) => row.taskId !== taskId)
    .sort((a, b) => a.position - b.position);
  const thisRow = destRows.find((row) => row.taskId === taskId);
  if (!thisRow) {
    return { error: "Failed to place task" };
  }
  const clampedIndex = Math.max(0, Math.min(position, others.length));
  const ordered = [...others.slice(0, clampedIndex), thisRow, ...others.slice(clampedIndex)];

  await Promise.all(
    ordered.map((row, index) =>
      row.position === index
        ? Promise.resolve()
        : db.update(taskProjects).set({ position: index }).where(eq(taskProjects.id, row.id)),
    ),
  );

  if (leavingASection && oldSectionId !== null) {
    await renumberSection(projectId, oldSectionId);
    await logActivity(taskId, userId, "section_changed", {
      projectId: projectId,
      from: oldSectionId,
      to: sectionId,
    });
  }
  return { success: true };
}


export async function updateTask(taskId: number, userId: number, updates:updateTaskSchema ,) {
    const body =updates;
  
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
          await db.update(tasks).set(updates).where(eq(tasks.id, taskId));
        }
  
        const primaryProjectId = access.links[0]?.project.id ?? null;
  
        if (body.assigneeId !== undefined && body.assigneeId !== before.assigneeId) {
          await logActivity(taskId, request.user.sub, "assignee_changed", {
            from: before.assigneeId,
            to: body.assigneeId,
          });
          if (body.assigneeId !== null) {
            await addFollower(taskId, body.assigneeId);
            await createNotification({
              userId: body.assigneeId,
              type: "assigned",
              actorId: request.user.sub,
              taskId: taskId,
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
          await logActivity(taskId, request.user.sub, "due_date_changed", {
            from: { start: beforeStart, end: beforeEnd },
            to: {
              start: afterStart !== undefined ? afterStart || null : beforeStart,
              end: afterEnd !== undefined ? afterEnd || null : beforeEnd,
            },
          });
          if (primaryProjectId !== null) {
            await notifyFollowers({
              taskId: taskId,
              projectId: primaryProjectId,
              type: "due_date_changed",
              actorId: request.user.sub,
            });
          }
        }
  
        if (body.completed !== undefined && body.completed !== before.completed) {
          await logActivity(taskId, request.user.sub, body.completed ? "completed" : "reopened");
          if (body.completed && primaryProjectId !== null) {
            await notifyFollowers({
              taskId: taskId,
              projectId: primaryProjectId,
              type: "completed",
              actorId: request.user.sub,
            });
          }
        }
}
