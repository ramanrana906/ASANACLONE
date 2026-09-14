import { z } from "zod";
import { taskPersonSchema } from "./task";

export const commentSchema = z.object({
  id: z.number(),
  taskId: z.number(),
  author: taskPersonSchema,
  body: z.string().min(1),
  createdAt: z.string(),
  editedAt: z.string().nullable(),
});
export type Comment = z.infer<typeof commentSchema>;

export const createCommentSchema = z.object({
  body: z.string().min(1).max(5000),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const activityTypeSchema = z.enum([
  "due_date_changed",
  "assignee_changed",
  "completed",
  "reopened",
  "section_changed",
]);
export type ActivityType = z.infer<typeof activityTypeSchema>;

export const activityEntrySchema = z.object({
  id: z.number(),
  taskId: z.number(),
  actor: taskPersonSchema,
  type: activityTypeSchema,
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
});
export type ActivityEntry = z.infer<typeof activityEntrySchema>;

export const attachmentSchema = z.object({
  id: z.number(),
  taskId: z.number(),
  uploadedBy: taskPersonSchema,
  fileName: z.string(),
  fileUrl: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
  createdAt: z.string(),
});
export type Attachment = z.infer<typeof attachmentSchema>;

export const addFollowerSchema = z.object({
  userId: z.number(),
});
export type AddFollowerInput = z.infer<typeof addFollowerSchema>;
