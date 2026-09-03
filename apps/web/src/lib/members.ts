import type {
  AcceptedInvite,
  InviteInput,
  PendingInvite,
  UpdateMemberRoleInput,
  WorkspaceMember,
} from "@asanaClone/shared";
import { apiFetch } from "./api";

export function listMembers(workspaceId: number) {
  return apiFetch<WorkspaceMember[]>(`/api/workspaces/${workspaceId}/members`);
}

export function updateMemberRole(
  workspaceId: number,
  userId: number,
  input: UpdateMemberRoleInput,
) {
  return apiFetch<{ ok: boolean }>(`/api/workspaces/${workspaceId}/members/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function removeMember(workspaceId: number, userId: number) {
  return apiFetch<{ ok: boolean }>(`/api/workspaces/${workspaceId}/members/${userId}`, {
    method: "DELETE",
  });
}

export function listPendingInvites(workspaceId: number) {
  return apiFetch<PendingInvite[]>(`/api/workspaces/${workspaceId}/invites`);
}

export function sendInvites(workspaceId: number, input: InviteInput) {
  return apiFetch<PendingInvite[]>(`/api/workspaces/${workspaceId}/invites`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function acceptInvite(token: string) {
  return apiFetch<AcceptedInvite>(`/api/invites/${token}/accept`, { method: "POST" });
}
