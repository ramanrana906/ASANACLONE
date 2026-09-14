import { z } from "zod";
import { taskPersonSchema } from "./task";

export const notificationTypeSchema = z.enum([
  "assigned",
  "commented",
  "mentioned",
  "due_date_changed",
  "completed",
]);
export type NotificationType = z.infer<typeof notificationTypeSchema>;

export const notificationSchema = z.object({
  id: z.number(),
  type: notificationTypeSchema,
  read: z.boolean(),
  createdAt: z.string(),
  actor: taskPersonSchema.nullable(),
  task: z.object({ id: z.number(), title: z.string() }).nullable(),
  project: z.object({ id: z.number(), name: z.string() }).nullable(),
});
export type NotificationEntry = z.infer<typeof notificationSchema>;

export const notificationCategorySchema = z.enum(["project", "portfolio", "goal", "email"]);
export type NotificationCategory = z.infer<typeof notificationCategorySchema>;

export const notificationPreferenceSchema = z.object({
  category: notificationCategorySchema,
  enabled: z.boolean(),
});
export type NotificationPreference = z.infer<typeof notificationPreferenceSchema>;

export const notificationSettingsSchema = z.object({
  preferences: z.array(notificationPreferenceSchema),
  doNotDisturbUntil: z.string().nullable(),
});
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;

export const updateNotificationSettingsSchema = z.object({
  preferences: z.array(notificationPreferenceSchema).optional(),
  doNotDisturbUntil: z.string().nullable().optional(),
});
export type UpdateNotificationSettingsInput = z.infer<typeof updateNotificationSettingsSchema>;
