import type { ActivityEntry } from "@asanaClone/shared";
import { apiFetch } from "./api";

export function listActivity(taskId: number) {
  return apiFetch<ActivityEntry[]>(`/api/tasks/${taskId}/activity`);
}
