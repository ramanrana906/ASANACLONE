import { z } from "zod";

export const projectStatusSchema = z.enum(["on_track", "at_risk", "off_track"]);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const projectRoleSchema = z.enum(["owner", "editor", "commenter"]);
export type ProjectRole = z.infer<typeof projectRoleSchema>;

export const projectSchema = z.object({
  id: z.number(),
  workspaceId: z.number(),
  name: z.string().min(1),
  description: z.string().nullable(),
  status: projectStatusSchema.nullable(),
  ownerId: z.number(),
  createdAt: z.string(),
});
export type Project = z.infer<typeof projectSchema>;

export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
});
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const updateProjectStatusSchema = z.object({
  status: projectStatusSchema.nullable(),
});
export type UpdateProjectStatusInput = z.infer<typeof updateProjectStatusSchema>;

export const projectMemberSchema = z.object({
  userId: z.number(),
  projectId: z.number(),
  role: projectRoleSchema,
  name: z.string(),
  email: z.string().email(),
  photoUrl: z.string().url().nullable(),
  createdAt: z.string(),
});
export type ProjectMember = z.infer<typeof projectMemberSchema>;

export const addProjectMemberSchema = z.object({
  userId: z.number(),
  role: projectRoleSchema.default("editor"),
});
export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>;
