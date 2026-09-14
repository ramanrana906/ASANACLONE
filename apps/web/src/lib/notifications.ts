import type { NotificationEntry, NotificationSettings, UpdateNotificationSettingsInput } from "@asanaClone/shared";
import { apiFetch } from "./api";

export function listNotifications() {
  return apiFetch<NotificationEntry[]>("/api/me/notifications");
}

export function markNotificationRead(id: number) {
  return apiFetch<{ ok: boolean }>(`/api/me/notifications/${id}/read`, { method: "PATCH" });
}

export function archiveAllNotifications() {
  return apiFetch<{ ok: boolean }>("/api/me/notifications/archive-all", { method: "POST" });
}

export function getNotificationSettings() {
  return apiFetch<NotificationSettings>("/api/me/notification-preferences");
}

export function updateNotificationSettings(input: UpdateNotificationSettingsInput) {
  return apiFetch<NotificationSettings>("/api/me/notification-preferences", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
