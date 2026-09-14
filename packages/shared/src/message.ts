import { z } from "zod";
import { taskPersonSchema } from "./task";

export const messageSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  author: taskPersonSchema,
  body: z.string().min(1),
  createdAt: z.string(),
  editedAt: z.string().nullable(),
});
export type Message = z.infer<typeof messageSchema>;

export const createMessageSchema = z.object({
  body: z.string().min(1).max(5000),
});
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
