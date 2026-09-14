import { eq } from "drizzle-orm";
import { db } from "../db";
import { projects, taskProjects, tasks } from "../db/schema";
import { getMembership } from "./workspaceAccess";

export type TaskProjectLink = {
  link: typeof taskProjects.$inferSelect;
  project: typeof projects.$inferSelect;
};

export type TaskAccess = {
  task: typeof tasks.$inferSelect;
  links: TaskProjectLink[];
};

export async function getTaskProjectLinks(taskId: number): Promise<TaskProjectLink[]> {
  return db
    .select({ link: taskProjects, project: projects })
    .from(taskProjects)
    .innerJoin(projects, eq(taskProjects.projectId, projects.id))
    .where(eq(taskProjects.taskId, taskId));
}

export async function requireTaskAccess(
  taskId: number,
  userId: number,
): Promise<TaskAccess | null> {
  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
  if (!task) return null;

  const links = await getTaskProjectLinks(taskId);

  for (const { project } of links) {
    const membership = await getMembership(project.workspaceId, userId);
    if (membership) {
      return { task, links };
    }
  }

  // Subtasks don't carry their own project links — access follows the parent task.
  if (links.length === 0 && task.parentTaskId) {
    const parentAccess = await requireTaskAccess(task.parentTaskId, userId);
    if (parentAccess) {
      return { task, links: parentAccess.links };
    }
  }

  return null;
}
