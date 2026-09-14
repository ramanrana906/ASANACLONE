import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  updateNotificationSettingsSchema,
  type NotificationCategory,
  type NotificationEntry,
  type NotificationSettings,
} from "@asanaClone/shared";
import { db } from "../db";
import { notificationPreferences, notifications, projects, tasks, users } from "../db/schema";

const notificationIdParamsSchema = z.object({ id: z.coerce.number() });

const ALL_CATEGORIES: NotificationCategory[] = ["project", "portfolio", "goal", "email"];

async function loadNotificationSettings(userId: number): Promise<NotificationSettings> {
  const rows = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId));
  const byCategory = new Map(rows.map((row) => [row.category, row.enabled]));

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });

  return {
    preferences: ALL_CATEGORIES.map((category) => ({
      category,
      enabled: byCategory.get(category) ?? true,
    })),
    doNotDisturbUntil: user?.doNotDisturbUntil ? user.doNotDisturbUntil.toISOString() : null,
  };
}

export const notificationsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/api/me/notifications", { preHandler: [app.authenticate] }, async (request, reply) => {
    const rows = await db
      .select({ notification: notifications, actor: users, task: tasks, project: projects })
      .from(notifications)
      .leftJoin(users, eq(notifications.actorId, users.id))
      .leftJoin(tasks, eq(notifications.taskId, tasks.id))
      .leftJoin(projects, eq(notifications.projectId, projects.id))
      .where(eq(notifications.userId, request.user.sub))
      .orderBy(desc(notifications.createdAt));

    const result: NotificationEntry[] = rows.map((row) => ({
      id: row.notification.id,
      type: row.notification.type,
      read: row.notification.read,
      createdAt: row.notification.createdAt.toISOString(),
      actor: row.actor ? { id: row.actor.id, name: row.actor.name, email: row.actor.email } : null,
      task: row.task ? { id: row.task.id, title: row.task.title } : null,
      project: row.project ? { id: row.project.id, name: row.project.name } : null,
    }));

    return reply.send(result);
  });

  app.patch(
    "/api/me/notifications/:id/read",
    { schema: { params: notificationIdParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const notification = await db.query.notifications.findFirst({
        where: and(eq(notifications.id, request.params.id), eq(notifications.userId, request.user.sub)),
      });
      if (!notification) {
        return reply.status(404).send({ error: "Notification not found" });
      }

      await db.update(notifications).set({ read: true }).where(eq(notifications.id, notification.id));

      return reply.send({ ok: true });
    },
  );

  app.post(
    "/api/me/notifications/archive-all",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      await db
        .update(notifications)
        .set({ read: true })
        .where(and(eq(notifications.userId, request.user.sub), eq(notifications.read, false)));

      return reply.send({ ok: true });
    },
  );

  app.get(
    "/api/me/notification-preferences",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      return reply.send(await loadNotificationSettings(request.user.sub));
    },
  );

  app.patch(
    "/api/me/notification-preferences",
    { schema: { body: updateNotificationSettingsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const { preferences, doNotDisturbUntil } = request.body;

      if (preferences) {
        await Promise.all(
          preferences.map((pref) =>
            db
              .insert(notificationPreferences)
              .values({ userId: request.user.sub, category: pref.category, enabled: pref.enabled })
              .onConflictDoUpdate({
                target: [notificationPreferences.userId, notificationPreferences.category],
                set: { enabled: pref.enabled },
              }),
          ),
        );
      }

      if (doNotDisturbUntil !== undefined) {
        await db
          .update(users)
          .set({ doNotDisturbUntil: doNotDisturbUntil ? new Date(doNotDisturbUntil) : null })
          .where(eq(users.id, request.user.sub));
      }

      return reply.send(await loadNotificationSettings(request.user.sub));
    },
  );
};
