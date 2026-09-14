import type { MyTask } from "@asanaClone/shared";
import { apiFetch } from "./api";

export function listMyTasks() {
  return apiFetch<MyTask[]>("/api/me/tasks");
}
