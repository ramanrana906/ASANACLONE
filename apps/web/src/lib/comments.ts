import type { Comment, CreateCommentInput } from "@asanaClone/shared";
import { apiFetch } from "./api";

export function listComments(taskId: number) {
  return apiFetch<Comment[]>(`/api/tasks/${taskId}/comments`);
}

export function createComment(taskId: number, input: CreateCommentInput) {
  return apiFetch<Comment>(`/api/tasks/${taskId}/comments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
