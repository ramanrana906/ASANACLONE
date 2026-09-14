import { z } from "zod";
import { customFieldValueDataSchema, taskCustomFieldSchema } from "./customField";

export const taskSchema = z.object({
  id: z.number(),
  title: z.string().min(1),
  description: z.string().nullable(),
  completed: z.boolean(),
  completedAt: z.string().nullable(),
  dueDateStart: z.string().nullable(),
  dueDateEnd: z.string().nullable(),
  assigneeId: z.number().nullable(),
  createdBy: z.number(),
  parentTaskId: z.number().nullable(),
  isMilestone: z.boolean(),
  createdAt: z.string(),
});
export type Task = z.infer<typeof taskSchema>;

export const taskPersonSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
});
export type TaskPerson = z.infer<typeof taskPersonSchema>;

// A lightweight card shape for a Board column — one per (task, project) pairing.
// Also reused by the List and Calendar tabs, which is why it carries this
// project's custom field values too (keyed by customFieldId).
export const taskCardSchema = z.object({
  id: z.number(),
  title: z.string(),
  completed: z.boolean(),
  dueDateStart: z.string().nullable(),
  dueDateEnd: z.string().nullable(),
  sectionId: z.number(),
  position: z.number(),
  assignee: taskPersonSchema.nullable(),
  isMilestone: z.boolean(),
  customFieldValues: z.array(
    z.object({ customFieldId: z.number(), value: customFieldValueDataSchema }),
  ),
});
export type TaskCard = z.infer<typeof taskCardSchema>;

export const taskProjectRefSchema = z.object({
  projectId: z.number(),
  projectName: z.string(),
  sectionId: z.number(),
  sectionName: z.string(),
  customFields: z.array(taskCustomFieldSchema),
});
export type TaskProjectRef = z.infer<typeof taskProjectRefSchema>;

// The full shape shown in the task detail side panel.
export const taskDetailSchema = taskSchema.extend({
  assignee: taskPersonSchema.nullable(),
  projects: z.array(taskProjectRefSchema),
  followers: z.array(taskPersonSchema),
});
export type TaskDetail = z.infer<typeof taskDetailSchema>;

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  projectId: z.number(),
  sectionId: z.number(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).nullable().optional(),
  assigneeId: z.number().nullable().optional(),
  dueDateStart: z.string().nullable().optional(),
  dueDateEnd: z.string().nullable().optional(),
  completed: z.boolean().optional(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const moveTaskSchema = z.object({
  projectId: z.number(),
  sectionId: z.number(),
  position: z.number(),
});
export type MoveTaskInput = z.infer<typeof moveTaskSchema>;

export const setMilestoneSchema = z.object({
  isMilestone: z.boolean(),
});
export type SetMilestoneInput = z.infer<typeof setMilestoneSchema>;

export const subtaskSchema = z.object({
  id: z.number(),
  title: z.string(),
  completed: z.boolean(),
});
export type Subtask = z.infer<typeof subtaskSchema>;

export const createSubtaskSchema = z.object({
  title: z.string().min(1).max(500),
});
export type CreateSubtaskInput = z.infer<typeof createSubtaskSchema>;

export const taskDependencyRefSchema = z.object({
  dependencyId: z.number(),
  task: z.object({ id: z.number(), title: z.string(), completed: z.boolean() }),
});
export type TaskDependencyRef = z.infer<typeof taskDependencyRefSchema>;

export const taskDependenciesSchema = z.object({
  blockedBy: z.array(taskDependencyRefSchema),
  blocking: z.array(taskDependencyRefSchema),
});
export type TaskDependencies = z.infer<typeof taskDependenciesSchema>;

export const createTaskDependencySchema = z.object({
  dependsOnTaskId: z.number(),
});
export type CreateTaskDependencyInput = z.infer<typeof createTaskDependencySchema>;

// A task assigned to the current user, with just enough project/section context
// to link back to where it lives — used by the "My Tasks" page.
export const myTaskSchema = z.object({
  id: z.number(),
  title: z.string(),
  completed: z.boolean(),
  dueDateStart: z.string().nullable(),
  dueDateEnd: z.string().nullable(),
  isMilestone: z.boolean(),
  projectId: z.number(),
  projectName: z.string(),
  sectionId: z.number(),
  sectionName: z.string(),
});
export type MyTask = z.infer<typeof myTaskSchema>;
