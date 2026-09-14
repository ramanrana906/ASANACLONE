import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NotificationEntry } from "@asanaClone/shared";
import {
  archiveAllNotifications,
  listNotifications,
  markNotificationRead,
} from "../../lib/notifications";
import { Avatar } from "../common/Avatar";
import { TaskDetailPanel } from "../tasks/TaskDetailPanel";

interface InboxPageProps {
  workspaceId: number;
}

type Tab = "activity" | "mentioned" | "archive";

const TABS: { key: Tab; label: string }[] = [
  { key: "activity", label: "Activity" },
  { key: "mentioned", label: "@Mentioned" },
  { key: "archive", label: "Archive" },
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const key = dayKey(date);
  if (key === dayKey(now)) return "Today";
  if (key === dayKey(yesterday)) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function describe(entry: NotificationEntry): string {
  const actor = entry.actor?.name ?? "Someone";
  switch (entry.type) {
    case "assigned":
      return `${actor} assigned you a task`;
    case "commented":
      return `${actor} commented on a task you follow`;
    case "mentioned":
      return `${actor} mentioned you in a comment`;
    case "due_date_changed":
      return `${actor} changed the due date on a task you follow`;
    case "completed":
      return `${actor} completed a task you follow`;
  }
}

export function InboxPage({ workspaceId }: InboxPageProps) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("activity");
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);

  const notificationsQuery = useQuery({ queryKey: ["me", "notifications"], queryFn: listNotifications });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "notifications"] }),
  });
  const archiveAllMutation = useMutation({
    mutationFn: archiveAllNotifications,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "notifications"] }),
  });

  const all = notificationsQuery.data ?? [];
  const filtered =
    tab === "activity"
      ? all.filter((n) => !n.read)
      : tab === "archive"
        ? all.filter((n) => n.read)
        : all.filter((n) => n.type === "mentioned");

  const groups = useMemo(() => {
    const map = new Map<string, NotificationEntry[]>();
    for (const entry of filtered) {
      const label = dayLabel(entry.createdAt);
      const list = map.get(label) ?? [];
      list.push(entry);
      map.set(label, list);
    }
    return map;
  }, [filtered]);

  function handleOpen(entry: NotificationEntry) {
    if (!entry.read) markReadMutation.mutate(entry.id);
    if (entry.task) setOpenTaskId(entry.task.id);
  }

  const unreadCount = all.filter((n) => !n.read).length;

  if (notificationsQuery.isLoading) {
    return (
      <div className="app-main">
        <p aria-live="polite">Loading…</p>
      </div>
    );
  }

  return (
    <div className="personal-page">
      <div className="personal-page__header">
        <h1>Inbox</h1>
        {tab === "activity" && unreadCount > 0 && (
          <button
            type="button"
            className="personal-page__toggle"
            onClick={() => archiveAllMutation.mutate()}
            disabled={archiveAllMutation.isPending}
          >
            Archive all
          </button>
        )}
      </div>

      <nav className="inbox-page__tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={tab === t.key ? "is-active" : ""}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {filtered.length === 0 && (
        <p className="personal-page__empty">
          {tab === "activity"
            ? "You're all caught up."
            : tab === "archive"
              ? "Nothing archived yet."
              : "No mentions yet."}
        </p>
      )}

      {[...groups.entries()].map(([label, entries]) => (
        <div className="inbox-page__group" key={label}>
          <h2>{label}</h2>
          {entries.map((entry) => (
            <button
              type="button"
              key={entry.id}
              className={entry.read ? "inbox-page__row" : "inbox-page__row is-unread"}
              onClick={() => handleOpen(entry)}
            >
              {!entry.read && <span className="inbox-page__dot" aria-hidden="true" />}
              <Avatar name={entry.actor?.name ?? "?"} userKey={entry.actor?.id ?? 0} size={28} />
              <span className="inbox-page__body">
                <span className="inbox-page__text">
                  {describe(entry)}
                  {entry.task && <strong> — {entry.task.title}</strong>}
                </span>
                <span className="inbox-page__meta">
                  {entry.project?.name} · {formatTime(entry.createdAt)}
                </span>
              </span>
            </button>
          ))}
        </div>
      ))}

      {openTaskId !== null && (
        <TaskDetailPanel
          taskId={openTaskId}
          workspaceId={workspaceId}
          onClose={() => setOpenTaskId(null)}
        />
      )}
    </div>
  );
}
