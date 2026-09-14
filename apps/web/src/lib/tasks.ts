import type {
  CreateTaskInput,
  MoveTaskInput,
  SetMilestoneInput,
  TaskCard,
  TaskDetail,
  UpdateTaskInput,
} from "@asanaClone/shared";
import { apiFetch } from "./api";

export function listProjectTasks(projectId: number) {
  return apiFetch<TaskCard[]>(`/api/projects/${projectId}/tasks`);
}

export function createTask(input: CreateTaskInput) {
  return apiFetch<TaskDetail>(`/api/tasks`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getTask(taskId: number) {
  return apiFetch<TaskDetail>(`/api/tasks/${taskId}`);
}

export function updateTask(taskId: number, input: UpdateTaskInput) {
  return apiFetch<TaskDetail>(`/api/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteTask(taskId: number) {
  return apiFetch<{ ok: boolean }>(`/api/tasks/${taskId}`, { method: "DELETE" });
}

export function moveTask(taskId: number, input: MoveTaskInput) {
  return apiFetch<TaskDetail>(`/api/tasks/${taskId}/move`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function removeTaskFromProject(taskId: number, projectId: number) {
  return apiFetch<TaskDetail>(`/api/tasks/${taskId}/projects/${projectId}`, {
    method: "DELETE",
  });
}

export function setMilestone(taskId: number, input: SetMilestoneInput) {
  return apiFetch<TaskDetail>(`/api/tasks/${taskId}/milestone`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
