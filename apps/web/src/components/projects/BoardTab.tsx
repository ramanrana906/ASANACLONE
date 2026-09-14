import { useState, type DragEvent, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "@phosphor-icons/react";
import type { Section, TaskCard as TaskCardType } from "@asanaClone/shared";
import {
  createSection,
  deleteSection,
  listSections,
  reorderSections,
  updateSection,
} from "../../lib/sections";
import { createTask, listProjectTasks, moveTask, updateTask } from "../../lib/tasks";
import { ConfirmIconButton } from "../common/ConfirmIconButton";
import { TaskCardItem } from "../tasks/TaskCard";
import { TaskDetailPanel } from "../tasks/TaskDetailPanel";

interface BoardTabProps {
  projectId: number;
  workspaceId: number;
}

interface SectionColumnProps {
  section: Section;
  tasksInSection: TaskCardType[];
  draggingSection: boolean;
  onSectionDragStart: () => void;
  onSectionDragEnd: () => void;
  onSectionDropOn: () => void;
  onRenameSection: (name: string) => void;
  onDeleteSection: () => void;
  isDraggingTask: boolean;
  draggingTaskId: number | null;
  onTaskDragStart: (event: DragEvent, taskId: number) => void;
  onTaskDragEnd: () => void;
  onTaskDropAt: (index: number) => void;
  onOpenTask: (taskId: number) => void;
  onToggleComplete: (task: TaskCardType) => void;
  creatingTask: boolean;
  onStartCreateTask: () => void;
  onCancelCreateTask: () => void;
  onCreateTask: (title: string) => void;
}

function SectionColumn({
  section,
  tasksInSection,
  draggingSection,
  onSectionDragStart,
  onSectionDragEnd,
  onSectionDropOn,
  onRenameSection,
  onDeleteSection,
  isDraggingTask,
  draggingTaskId,
  onTaskDragStart,
  onTaskDragEnd,
  onTaskDropAt,
  onOpenTask,
  onToggleComplete,
  creatingTask,
  onStartCreateTask,
  onCancelCreateTask,
  onCreateTask,
}: SectionColumnProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(section.name);
  const [taskTitle, setTaskTitle] = useState("");

  function commitName() {
    setEditing(false);
    const trimmed = name.trim();
    if (trimmed && trimmed !== section.name) {
      onRenameSection(trimmed);
    } else {
      setName(section.name);
    }
  }

  function handleCreateTask(event: FormEvent) {
    event.preventDefault();
    if (!taskTitle.trim()) return;
    onCreateTask(taskTitle.trim());
    setTaskTitle("");
  }

  return (
    <div
      className={draggingSection ? "board-column is-dragging" : "board-column"}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        if (isDraggingTask) return;
        event.preventDefault();
        onSectionDropOn();
      }}
    >
      <div
        className="board-column__header"
        draggable
        onDragStart={onSectionDragStart}
        onDragEnd={onSectionDragEnd}
      >
        {editing ? (
          <input
            className="board-column__title-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={commitName}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitName();
              if (event.key === "Escape") {
                setName(section.name);
                setEditing(false);
              }
            }}
            autoFocus
          />
        ) : (
          <button
            type="button"
            className="board-column__title"
            onClick={() => setEditing(true)}
            title={section.name}
          >
            <span className="board-column__title-text">{section.name}</span>
            <span className="board-column__count">{tasksInSection.length}</span>
          </button>
        )}
        <ConfirmIconButton
          icon={<X size={13} weight="bold" />}
          label={`Delete ${section.name}`}
          onConfirm={onDeleteSection}
        />
      </div>

      <div
        className="board-column__body"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          if (!isDraggingTask) return;
          event.preventDefault();
          event.stopPropagation();
          onTaskDropAt(tasksInSection.length);
        }}
      >
        {tasksInSection.length === 0 && !creatingTask && (
          <p className="board-column__empty">No tasks yet.</p>
        )}

        {tasksInSection.map((task, index) => (
          <div
            key={task.id}
            onDragOver={(event) => {
              if (!isDraggingTask) return;
              event.preventDefault();
              event.stopPropagation();
            }}
            onDrop={(event) => {
              if (!isDraggingTask) return;
              event.preventDefault();
              event.stopPropagation();
              onTaskDropAt(index);
            }}
          >
            <TaskCardItem
              task={task}
              dragging={draggingTaskId === task.id}
              onDragStart={(event) => onTaskDragStart(event, task.id)}
              onDragEnd={onTaskDragEnd}
              onOpen={() => onOpenTask(task.id)}
              onToggleComplete={() => onToggleComplete(task)}
            />
          </div>
        ))}

        {creatingTask ? (
          <form className="board-column__add-task-form" onSubmit={handleCreateTask}>
            <input
              value={taskTitle}
              onChange={(event) => setTaskTitle(event.target.value)}
              placeholder="Task name"
              autoFocus
              onBlur={() => {
                if (!taskTitle.trim()) onCancelCreateTask();
              }}
            />
          </form>
        ) : (
          <button type="button" className="board-column__add-task" onClick={onStartCreateTask}>
            <Plus size={13} weight="bold" />
            Add task
          </button>
        )}
      </div>
    </div>
  );
}

export function BoardTab({ projectId, workspaceId }: BoardTabProps) {
  const queryClient = useQueryClient();
  const sectionsKey = ["projects", projectId, "sections"];
  const tasksKey = ["projects", projectId, "tasks"];

  const [creatingSection, setCreatingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [dragSectionId, setDragSectionId] = useState<number | null>(null);
  const [dragTaskId, setDragTaskId] = useState<number | null>(null);
  const [creatingTaskInSection, setCreatingTaskInSection] = useState<number | null>(null);
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);

  const sectionsQuery = useQuery({ queryKey: sectionsKey, queryFn: () => listSections(projectId) });
  const tasksQuery = useQuery({ queryKey: tasksKey, queryFn: () => listProjectTasks(projectId) });
  const sectionsList = sectionsQuery.data ?? [];
  const tasksList = tasksQuery.data ?? [];

  const tasksBySection = new Map<number, TaskCardType[]>();
  for (const task of tasksList) {
    const list = tasksBySection.get(task.sectionId) ?? [];
    list.push(task);
    tasksBySection.set(task.sectionId, list);
  }
  for (const list of tasksBySection.values()) {
    list.sort((a, b) => a.position - b.position);
  }

  const createSectionMutation = useMutation({
    mutationFn: (name: string) => createSection(projectId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sectionsKey });
      setNewSectionName("");
      setCreatingSection(false);
    },
  });

  const renameSectionMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => updateSection(id, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sectionsKey }),
  });

  const deleteSectionMutation = useMutation({
    mutationFn: (id: number) => deleteSection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sectionsKey });
      queryClient.invalidateQueries({ queryKey: tasksKey });
    },
  });

  const reorderSectionsMutation = useMutation({
    mutationFn: (sectionIds: number[]) => reorderSections(projectId, { sectionIds }),
    onSuccess: (updated) => queryClient.setQueryData(sectionsKey, updated),
  });

  const createTaskMutation = useMutation({
    mutationFn: ({ sectionId, title }: { sectionId: number; title: string }) =>
      createTask({ title, projectId, sectionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKey });
      setCreatingTaskInSection(null);
    },
  });

  const moveTaskMutation = useMutation({
    mutationFn: ({
      taskId,
      sectionId,
      position,
    }: {
      taskId: number;
      sectionId: number;
      position: number;
    }) => moveTask(taskId, { projectId, sectionId, position }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tasksKey }),
  });

  const toggleCompleteMutation = useMutation({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) =>
      updateTask(id, { completed }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tasksKey }),
  });

  function handleSectionDropOn(targetId: number) {
    if (dragSectionId === null || dragSectionId === targetId) return;
    const current = [...sectionsList];
    const fromIndex = current.findIndex((s) => s.id === dragSectionId);
    const toIndex = current.findIndex((s) => s.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const [moved] = current.splice(fromIndex, 1);
    current.splice(toIndex, 0, moved);
    queryClient.setQueryData(sectionsKey, current);
    reorderSectionsMutation.mutate(current.map((s) => s.id));
    setDragSectionId(null);
  }

  function handleTaskDropAt(sectionId: number, index: number) {
    if (dragTaskId === null) return;
    moveTaskMutation.mutate({ taskId: dragTaskId, sectionId, position: index });
    setDragTaskId(null);
  }

  function handleCreateSection(event: FormEvent) {
    event.preventDefault();
    if (!newSectionName.trim()) return;
    createSectionMutation.mutate(newSectionName.trim());
  }

  if (sectionsQuery.isLoading || tasksQuery.isLoading) {
    return <p aria-live="polite">Loading…</p>;
  }

  return (
    <div className="board-tab">
      <div className="board-columns">
        {sectionsList.map((section) => (
          <SectionColumn
            key={section.id}
            section={section}
            tasksInSection={tasksBySection.get(section.id) ?? []}
            draggingSection={dragSectionId === section.id}
            onSectionDragStart={() => setDragSectionId(section.id)}
            onSectionDragEnd={() => setDragSectionId(null)}
            onSectionDropOn={() => handleSectionDropOn(section.id)}
            onRenameSection={(name) => renameSectionMutation.mutate({ id: section.id, name })}
            onDeleteSection={() => deleteSectionMutation.mutate(section.id)}
            isDraggingTask={dragTaskId !== null}
            draggingTaskId={dragTaskId}
            onTaskDragStart={(event, taskId) => {
              event.stopPropagation();
              setDragTaskId(taskId);
            }}
            onTaskDragEnd={() => setDragTaskId(null)}
            onTaskDropAt={(index) => handleTaskDropAt(section.id, index)}
            onOpenTask={setOpenTaskId}
            onToggleComplete={(task) =>
              toggleCompleteMutation.mutate({ id: task.id, completed: !task.completed })
            }
            creatingTask={creatingTaskInSection === section.id}
            onStartCreateTask={() => setCreatingTaskInSection(section.id)}
            onCancelCreateTask={() => setCreatingTaskInSection(null)}
            onCreateTask={(title) => createTaskMutation.mutate({ sectionId: section.id, title })}
          />
        ))}

        <div className="board-column board-column--new">
          {creatingSection ? (
            <form onSubmit={handleCreateSection}>
              <input
                value={newSectionName}
                onChange={(event) => setNewSectionName(event.target.value)}
                placeholder="Section name"
                autoFocus
                onBlur={() => {
                  if (!newSectionName.trim()) setCreatingSection(false);
                }}
              />
            </form>
          ) : (
            <button type="button" onClick={() => setCreatingSection(true)}>
              <Plus size={14} weight="bold" />
              Add section
            </button>
          )}
        </div>
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
