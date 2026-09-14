import { and, eq } from "drizzle-orm";
import type { NotificationType } from "@asanaClone/shared";
import { db } from "../db";
import { notificationPreferences, notifications, taskFollowers } from "../db/schema";

export async function getTaskFollowerIds(taskId: number): Promise<number[]> {
  const rows = await db
    .select({ userId: taskFollowers.userId })
    .from(taskFollowers)
    .where(eq(taskFollowers.taskId, taskId));
  return rows.map((row) => row.userId);
}

async function projectNotificationsEnabled(userId: number): Promise<boolean> {
  const row = await db.query.notificationPreferences.findFirst({
    where: and(
      eq(notificationPreferences.userId, userId),
      eq(notificationPreferences.category, "project"),
    ),
  });
  return row ? row.enabled : true;
}

export async function createNotification(params: {
  userId: number;
  type: NotificationType;
  actorId?: number | null;
  taskId?: number | null;
  projectId?: number | null;
}) {
  const { userId, type, actorId = null, taskId = null, projectId = null } = params;
  if (actorId !== null && actorId === userId) return;
  if (!(await projectNotificationsEnabled(userId))) return;
  await db.insert(notifications).values({ userId, type, actorId, taskId, projectId });
}

export async function notifyFollowers(params: {
  taskId: number;
  projectId: number;
  type: NotificationType;
  actorId: number;
}) {
  const followerIds = await getTaskFollowerIds(params.taskId);
  await Promise.all(
    followerIds.map((userId) =>
      createNotification({
        userId,
        type: params.type,
        actorId: params.actorId,
        taskId: params.taskId,
        projectId: params.projectId,
      }),
    ),
  );
}
