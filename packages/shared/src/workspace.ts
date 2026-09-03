import { z } from "zod";
import { userRoleSchema } from "./user";

export const workspaceRoleSchema = userRoleSchema;
export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;

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

export const workspaceMemberSchema = z.object({
  userId: z.number(),
  workspaceId: z.number(),
  role: workspaceRoleSchema,
  name: z.string(),
  email: z.string().email(),
  photoUrl: z.string().url().nullable(),
  createdAt: z.string(),
});
export type WorkspaceMember = z.infer<typeof workspaceMemberSchema>;

export const updateMemberRoleSchema = z.object({
  role: workspaceRoleSchema,
});
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

export const inviteSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(50),
  role: workspaceRoleSchema.default("member"),
  projectIds: z.array(z.number()).optional(),
});
export type InviteInput = z.infer<typeof inviteSchema>;

export const inviteStatusSchema = z.enum(["pending", "accepted", "expired", "revoked"]);

export const pendingInviteSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  role: workspaceRoleSchema,
  status: inviteStatusSchema,
  createdAt: z.string(),
  expiresAt: z.string(),
});
export type PendingInvite = z.infer<typeof pendingInviteSchema>;

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
});
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;

export const acceptedInviteSchema = z.object({
  workspaceId: z.number(),
  workspaceName: z.string(),
});
export type AcceptedInvite = z.infer<typeof acceptedInviteSchema>;
