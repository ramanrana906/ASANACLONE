import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CaretLeft, CaretRight, Plus } from "@phosphor-icons/react";
import type { TaskCard as TaskCardType } from "@asanaClone/shared";
import { listSections } from "../../lib/sections";
import { createTask, listProjectTasks, updateTask } from "../../lib/tasks";
import { TaskDetailPanel } from "../tasks/TaskDetailPanel";

interface CalendarTabProps {
  projectId: number;
  workspaceId: number;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function CalendarTab({ projectId, workspaceId }: CalendarTabProps) {
  const queryClient = useQueryClient();
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [addingDate, setAddingDate] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);

  const sectionsQuery = useQuery({
    queryKey: ["projects", projectId, "sections"],
    queryFn: () => listSections(projectId),
  });
  const tasksQuery = useQuery({
    queryKey: ["projects", projectId, "tasks"],
    queryFn: () => listProjectTasks(projectId),
  });
  const sections = sectionsQuery.data ?? [];

  const createMutation = useMutation({
    mutationFn: async ({
      sectionId,
      title,
      date,
    }: {
      sectionId: number;
      title: string;
      date: string;
    }) => {
      const task = await createTask({ title, projectId, sectionId });
      await updateTask(task.id, { dueDateStart: date, dueDateEnd: date });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "tasks"] });
      setAddingDate(null);
      setTitle("");
    },
  });

  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const gridDays = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = firstOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: { date: Date; inMonth: boolean }[] = [];
    for (let i = startOffset; i > 0; i--) {
      days.push({ date: new Date(year, month, 1 - i), inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ date: new Date(year, month, d), inMonth: true });
    }
    while (days.length % 7 !== 0) {
      const last = days[days.length - 1].date;
      days.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false });
    }
    return days;
  }, [cursor]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskCardType[]>();
    for (const task of tasksQuery.data ?? []) {
      if (!task.dueDateStart) continue;
      const startKey = task.dueDateStart.slice(0, 10);
      const endKey = task.dueDateEnd ? task.dueDateEnd.slice(0, 10) : startKey;
      let cursorDate = parseDateOnly(startKey);
      const end = parseDateOnly(endKey);
      while (cursorDate <= end) {
        const key = toDateKey(cursorDate);
        const list = map.get(key) ?? [];
        list.push(task);
        map.set(key, list);
        cursorDate = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), cursorDate.getDate() + 1);
      }
    }
    return map;
  }, [tasksQuery.data]);

  function handleAddSubmit(event: FormEvent, date: string) {
    event.preventDefault();
    if (!title.trim() || sections.length === 0) return;
    createMutation.mutate({ sectionId: sections[0].id, title: title.trim(), date });
  }

  if (sectionsQuery.isLoading || tasksQuery.isLoading) {
    return <p aria-live="polite">Loading…</p>;
  }

  const todayKey = toDateKey(today);

  return (
    <div className="calendar-tab">
      <div className="calendar-tab__nav">
        <button
          type="button"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          aria-label="Previous month"
        >
          <CaretLeft size={16} weight="bold" />
        </button>
        <h2>{monthLabel}</h2>
        <button
          type="button"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          aria-label="Next month"
        >
          <CaretRight size={16} weight="bold" />
        </button>
        <button
          type="button"
          className="calendar-tab__today"
          onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
        >
          Today
        </button>
      </div>

      <div className="calendar-tab__grid">
        {WEEKDAYS.map((day) => (
          <div className="calendar-tab__weekday" key={day}>
            {day}
          </div>
        ))}
        {gridDays.map(({ date, inMonth }) => {
          const key = toDateKey(date);
          const dayTasks = tasksByDate.get(key) ?? [];
          const isToday = key === todayKey;
          return (
            <div
              className={
                "calendar-tab__day" +
                (inMonth ? "" : " is-outside") +
                (isToday ? " is-today" : "")
              }
              key={key}
            >
              <div className="calendar-tab__day-header">
                <span>{date.getDate()}</span>
                {sections.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAddingDate(key)}
                    aria-label={`Add task on ${monthLabel.split(" ")[0]} ${date.getDate()}`}
                  >
                    <Plus size={11} weight="bold" />
                  </button>
                )}
              </div>
              <div className="calendar-tab__day-tasks">
                {dayTasks.map((task) => (
                  <button
                    type="button"
                    key={task.id}
                    className={task.completed ? "calendar-tab__task-chip is-done" : "calendar-tab__task-chip"}
                    onClick={() => setOpenTaskId(task.id)}
                  >
                    {task.title}
                  </button>
                ))}
              </div>
              {addingDate === key && (
                <form className="calendar-tab__add-form" onSubmit={(event) => handleAddSubmit(event, key)}>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Task name"
                    autoFocus
                    onBlur={() => {
                      if (!title.trim()) setAddingDate(null);
                    }}
                  />
                </form>
              )}
            </div>
          );
        })}
      </div>

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
