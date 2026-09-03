import type { CreateWorkspaceInput, UpdateWorkspaceInput, Workspace } from "@asanaClone/shared";
import { apiFetch } from "./api";

export function listWorkspaces() {
  return apiFetch<Workspace[]>("/api/workspaces");
}

export function createWorkspace(input: CreateWorkspaceInput) {
  return apiFetch<Workspace>("/api/workspaces", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateWorkspace(id: number, input: UpdateWorkspaceInput) {
  return apiFetch<Workspace>(`/api/workspaces/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteWorkspace(id: number) {
  return apiFetch<{ ok: boolean }>(`/api/workspaces/${id}`, { method: "DELETE" });
}
