import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Circle, Plus, X } from "@phosphor-icons/react";
import { createSubtask, listSubtasks } from "../../lib/subtasks";
import { deleteTask, updateTask } from "../../lib/tasks";
import { ConfirmIconButton } from "../common/ConfirmIconButton";

interface SubtasksSectionProps {
  taskId: number;
}

export function SubtasksSection({ taskId }: SubtasksSectionProps) {
  const queryClient = useQueryClient();
  const queryKey = ["tasks", taskId, "subtasks"];
  const [title, setTitle] = useState("");

  const subtasksQuery = useQuery({ queryKey, queryFn: () => listSubtasks(taskId) });
  const subtasks = subtasksQuery.data ?? [];

  const createMutation = useMutation({
    mutationFn: (title: string) => createSubtask(taskId, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setTitle("");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) =>
      updateTask(id, { completed }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTask(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    createMutation.mutate(title.trim());
  }

  return (
    <div className="task-panel__row task-panel__row--subtasks">
      <span className="task-panel__row-label">Subtasks</span>
      <div className="task-subtasks-list">
        {subtasks.map((subtask) => (
          <div className="task-subtask" key={subtask.id}>
            <button
              type="button"
              className={subtask.completed ? "task-subtask__check is-done" : "task-subtask__check"}
              onClick={() => toggleMutation.mutate({ id: subtask.id, completed: !subtask.completed })}
              aria-label={
                subtask.completed
                  ? `Mark "${subtask.title}" incomplete`
                  : `Mark "${subtask.title}" complete`
              }
            >
              {subtask.completed ? <CheckCircle size={15} weight="fill" /> : <Circle size={15} />}
            </button>
            <span
              className={subtask.completed ? "task-subtask__title is-done" : "task-subtask__title"}
            >
              {subtask.title}
            </span>
            <ConfirmIconButton
              icon={<X size={11} weight="bold" />}
              label={`Delete ${subtask.title}`}
              onConfirm={() => deleteMutation.mutate(subtask.id)}
            />
          </div>
        ))}
      </div>
      <form className="task-subtasks-form" onSubmit={handleSubmit}>
        <Plus size={13} weight="bold" />
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Add subtask"
        />
      </form>
    </div>
  );
}
