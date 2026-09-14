import { eq } from "drizzle-orm";
import { db } from "../db";
import {
  activityLog,
  attachments,
  comments,
  customFieldValues,
  taskDependencies,
  taskFollowers,
  taskProjects,
  tasks,
} from "../db/schema";
import { deleteAttachmentFile } from "../infrastructure/attachmentStorage";

// Deletes a task and everything hanging off it: subtasks (recursively),
// comments, activity, attachments (files too), followers, custom field
// values, dependency links (either direction), and its project placements.
export async function deleteTaskFully(taskId: number): Promise<void> {
  const subtasks = await db.select().from(tasks).where(eq(tasks.parentTaskId, taskId));
  for (const subtask of subtasks) {
    await deleteTaskFully(subtask.id);
  }

  const files = await db.select().from(attachments).where(eq(attachments.taskId, taskId));
  await Promise.all(files.map((file) => deleteAttachmentFile(file.fileUrl)));

  await db.delete(attachments).where(eq(attachments.taskId, taskId));
  await db.delete(comments).where(eq(comments.taskId, taskId));
  await db.delete(activityLog).where(eq(activityLog.taskId, taskId));
  await db.delete(taskFollowers).where(eq(taskFollowers.taskId, taskId));
  await db.delete(customFieldValues).where(eq(customFieldValues.taskId, taskId));
  await db.delete(taskDependencies).where(eq(taskDependencies.taskId, taskId));
  await db.delete(taskDependencies).where(eq(taskDependencies.dependsOnTaskId, taskId));
  await db.delete(taskProjects).where(eq(taskProjects.taskId, taskId));
  await db.delete(tasks).where(eq(tasks.id, taskId));
}
