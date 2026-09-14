import type { CreateMessageInput, Message } from "@asanaClone/shared";
import { apiFetch } from "./api";

export function listMessages(projectId: number) {
  return apiFetch<Message[]>(`/api/projects/${projectId}/messages`);
}

export function createMessage(projectId: number, input: CreateMessageInput) {
  return apiFetch<Message>(`/api/projects/${projectId}/messages`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
