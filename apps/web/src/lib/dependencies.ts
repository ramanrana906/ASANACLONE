import type { CreateTaskDependencyInput, TaskDependencies } from "@asanaClone/shared";
import { apiFetch } from "./api";

export function listDependencies(taskId: number) {
  return apiFetch<TaskDependencies>(`/api/tasks/${taskId}/dependencies`);
}

export function addDependency(taskId: number, input: CreateTaskDependencyInput) {
  return apiFetch<{ ok: boolean }>(`/api/tasks/${taskId}/dependencies`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function removeDependency(taskId: number, dependencyId: number) {
  return apiFetch<{ ok: boolean }>(`/api/tasks/${taskId}/dependencies/${dependencyId}`, {
    method: "DELETE",
  });
}
