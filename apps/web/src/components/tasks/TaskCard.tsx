import type { DragEvent } from "react";
import { CheckCircle, Circle, Diamond } from "@phosphor-icons/react";
import type { TaskCard } from "@asanaClone/shared";
import { Avatar } from "../common/Avatar";

function formatDueRange(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (start && end && start.slice(0, 10) !== end.slice(0, 10)) {
    return `${fmt(start)} – ${fmt(end)}`;
  }
  return fmt(start ?? (end as string));
}

interface TaskCardItemProps {
  task: TaskCard;
  dragging: boolean;
  onDragStart: (event: DragEvent) => void;
  onDragEnd: () => void;
  onOpen: () => void;
  onToggleComplete: () => void;
}

export function TaskCardItem({
  task,
  dragging,
  onDragStart,
  onDragEnd,
  onOpen,
  onToggleComplete,
}: TaskCardItemProps) {
  const dueLabel = formatDueRange(task.dueDateStart, task.dueDateEnd);

  return (
    <div
      className={dragging ? "task-card is-dragging" : "task-card"}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <button
        type="button"
        className={task.completed ? "task-card__check is-done" : "task-card__check"}
        onClick={(event) => {
          event.stopPropagation();
          onToggleComplete();
        }}
        aria-label={
          task.completed ? `Mark "${task.title}" incomplete` : `Mark "${task.title}" complete`
        }
      >
        {task.completed ? <CheckCircle size={17} weight="fill" /> : <Circle size={17} />}
      </button>
      <button type="button" className="task-card__body" onClick={onOpen}>
        <span className={task.completed ? "task-card__title is-done" : "task-card__title"}>
          {task.isMilestone && (
            <Diamond size={12} weight="fill" className="task-card__milestone" aria-hidden="true" />
          )}
          {task.title}
        </span>
        {(dueLabel || task.assignee) && (
          <span className="task-card__meta">
            {dueLabel && <span className="task-card__due">{dueLabel}</span>}
            {task.assignee && (
              <Avatar name={task.assignee.name} userKey={task.assignee.id} size={20} />
            )}
          </span>
        )}
      </button>
    </div>
  );
}
