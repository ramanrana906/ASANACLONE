import { apiFetch } from "./api";

export function addFollower(taskId: number, userId: number) {
  return apiFetch<{ ok: boolean }>(`/api/tasks/${taskId}/followers`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export function removeFollower(taskId: number, userId: number) {
  return apiFetch<{ ok: boolean }>(`/api/tasks/${taskId}/followers/${userId}`, {
    method: "DELETE",
  });
}
