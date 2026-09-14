import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Circle, Diamond } from "@phosphor-icons/react";
import type { MyTask } from "@asanaClone/shared";
import { listMyTasks } from "../../lib/me";
import { updateTask } from "../../lib/tasks";
import { ProjectIcon } from "../common/ProjectIcon";
import { TaskDetailPanel } from "../tasks/TaskDetailPanel";

interface MyTasksPageProps {
  workspaceId: number;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDue(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type Bucket = "overdue" | "today" | "upcoming" | "no-date";

const BUCKET_LABELS: Record<Bucket, string> = {
  overdue: "Overdue",
  today: "Today",
  upcoming: "Upcoming",
  "no-date": "No due date",
};

function bucketOf(task: MyTask, today: string): Bucket {
  if (!task.dueDateStart) return "no-date";
  const key = task.dueDateStart.slice(0, 10);
  if (key < today) return "overdue";
  if (key === today) return "today";
  return "upcoming";
}

export function MyTasksPage({ workspaceId }: MyTasksPageProps) {
  const queryClient = useQueryClient();
  const [showCompleted, setShowCompleted] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);

  const tasksQuery = useQuery({ queryKey: ["me", "tasks"], queryFn: listMyTasks });

  const completeMutation = useMutation({
    mutationFn: ({ taskId, completed }: { taskId: number; completed: boolean }) =>
      updateTask(taskId, { completed }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "tasks"] }),
  });

  const today = todayKey();
  const tasks = tasksQuery.data ?? [];

  const groups = useMemo(() => {
    const buckets: Record<Bucket, MyTask[]> = {
      overdue: [],
      today: [],
      upcoming: [],
      "no-date": [],
    };
    for (const task of tasks) {
      if (task.completed && !showCompleted) continue;
      buckets[bucketOf(task, today)].push(task);
    }
    return buckets;
  }, [tasks, today, showCompleted]);

  const completedCount = tasks.filter((t) => t.completed).length;

  if (tasksQuery.isLoading) {
    return (
      <div className="app-main">
        <p aria-live="polite">Loading…</p>
      </div>
    );
  }

  return (
    <div className="personal-page">
      <div className="personal-page__header">
        <h1>My tasks</h1>
        {completedCount > 0 && (
          <button
            type="button"
            className="personal-page__toggle"
            onClick={() => setShowCompleted((v) => !v)}
          >
            {showCompleted ? "Hide completed" : `Show completed (${completedCount})`}
          </button>
        )}
      </div>

      {tasks.length === 0 && <p className="personal-page__empty">Nothing assigned to you yet.</p>}

      {(["overdue", "today", "upcoming", "no-date"] as Bucket[]).map((bucket) => {
        const rows = groups[bucket];
        if (rows.length === 0) return null;
        return (
          <div className="my-tasks__group" key={bucket}>
            <h2 className={bucket === "overdue" ? "is-overdue" : ""}>{BUCKET_LABELS[bucket]}</h2>
            {rows.map((task) => (
              <div className="my-tasks__row" key={task.id}>
                <button
                  type="button"
                  className="my-tasks__complete"
                  aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
                  onClick={() =>
                    completeMutation.mutate({ taskId: task.id, completed: !task.completed })
                  }
                >
                  {task.completed ? <CheckCircle size={18} weight="fill" /> : <Circle size={18} />}
                </button>
                <button
                  type="button"
                  className="my-tasks__title"
                  onClick={() => setOpenTaskId(task.id)}
                >
                  {task.isMilestone && (
                    <Diamond size={11} weight="fill" className="my-tasks__milestone" />
                  )}
                  <span className={task.completed ? "is-done" : ""}>{task.title}</span>
                </button>
                <span className="my-tasks__project">
                  <ProjectIcon projectKey={task.projectId} size={14} />
                  {task.projectName}
                </span>
                {task.dueDateStart && (
                  <span className="my-tasks__due">{formatDue(task.dueDateStart)}</span>
                )}
              </div>
            ))}
          </div>
        );
      })}

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
