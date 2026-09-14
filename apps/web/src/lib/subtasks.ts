import type { CreateSubtaskInput, Subtask } from "@asanaClone/shared";
import { apiFetch } from "./api";

export function listSubtasks(taskId: number) {
  return apiFetch<Subtask[]>(`/api/tasks/${taskId}/subtasks`);
}

export function createSubtask(taskId: number, input: CreateSubtaskInput) {
  return apiFetch<Subtask>(`/api/tasks/${taskId}/subtasks`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
