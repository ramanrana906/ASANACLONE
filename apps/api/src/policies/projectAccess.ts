import { eq } from "drizzle-orm";
import { db } from "../db";
import { projects } from "../db/schema";
import { getMembership } from "./workspaceAccess";

export async function requireProjectAccess(projectId: number, userId: number) {
  const project = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
  if (!project) return null;
  const membership = await getMembership(project.workspaceId, userId);
  if (!membership) return null;
  return project;
}
