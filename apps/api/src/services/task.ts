import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import {
  type ActivityType,
  type Task,
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
