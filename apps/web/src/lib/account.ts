import type { AddEmailInput, UpdateProfileInput, User, UserEmail } from "@asanaClone/shared";
import { apiFetch } from "./api";

export function updateProfile(input: UpdateProfileInput) {
  return apiFetch<User>("/api/users/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function listEmails() {
  return apiFetch<UserEmail[]>("/api/users/me/emails");
}

export function addEmail(input: AddEmailInput) {
  return apiFetch<UserEmail>("/api/users/me/emails", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteEmail(id: number) {
  return apiFetch<{ ok: boolean }>(`/api/users/me/emails/${id}`, { method: "DELETE" });
}

export function markEmailPreferred(id: number) {
  return apiFetch<UserEmail>(`/api/users/me/emails/${id}/preferred`, { method: "PATCH" });
}

export function revokeOtherSessions() {
  return apiFetch<{ ok: boolean }>("/api/auth/sessions/revoke-others", { method: "POST" });
}

export function deactivateAccount() {
  return apiFetch<{ ok: boolean }>("/api/users/me/deactivate", { method: "POST" });
}

export function deleteAccount() {
  return apiFetch<{ ok: boolean }>("/api/users/me", { method: "DELETE" });
}
