import { z } from "zod";

export const workspaceSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  ownerId: z.number(),
  createdAt: z.string(),
});
export type Workspace = z.infer<typeof workspaceSchema>;

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(200),
});
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(200),
});
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
