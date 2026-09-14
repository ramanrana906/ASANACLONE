import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "@phosphor-icons/react";
import { addDependency, listDependencies, removeDependency } from "../../lib/dependencies";
import { listProjectTasks } from "../../lib/tasks";
import { ConfirmIconButton } from "../common/ConfirmIconButton";

interface DependenciesSectionProps {
  taskId: number;
  projectId: number;
}

export function DependenciesSection({ taskId, projectId }: DependenciesSectionProps) {
  const queryClient = useQueryClient();
  const queryKey = ["tasks", taskId, "dependencies"];
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");

  const dependenciesQuery = useQuery({ queryKey, queryFn: () => listDependencies(taskId) });
  const dependencies = dependenciesQuery.data ?? { blockedBy: [], blocking: [] };

  const candidatesQuery = useQuery({
    queryKey: ["projects", projectId, "tasks"],
    queryFn: () => listProjectTasks(projectId),
    enabled: adding,
  });

  const addMutation = useMutation({
    mutationFn: (dependsOnTaskId: number) => addDependency(taskId, { dependsOnTaskId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setAdding(false);
      setSearch("");
    },
  });

  const removeMutation = useMutation({
    mutationFn: (dependencyId: number) => removeDependency(taskId, dependencyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const excludeIds = new Set([
    taskId,
    ...dependencies.blockedBy.map((dep) => dep.task.id),
    ...dependencies.blocking.map((dep) => dep.task.id),
  ]);
  const candidates = (candidatesQuery.data ?? []).filter(
    (task) => !excludeIds.has(task.id) && task.title.toLowerCase().includes(search.toLowerCase()),
  );

  const hasAny = dependencies.blockedBy.length > 0 || dependencies.blocking.length > 0;

  return (
    <div className="task-panel__row task-panel__row--dependencies">
      <span className="task-panel__row-label">Dependencies</span>
      {hasAny && (
        <div className="task-dependencies">
          {dependencies.blockedBy.length > 0 && (
            <div className="task-dependency-group">
              <span className="task-dependency-group__label">Blocked by</span>
              {dependencies.blockedBy.map((dep) => (
                <div className="task-dependency-item" key={dep.dependencyId}>
                  <span
                    className={
                      dep.task.completed
                        ? "task-dependency-item__title is-done"
                        : "task-dependency-item__title"
                    }
                  >
                    {dep.task.title}
                  </span>
                  <ConfirmIconButton
                    icon={<X size={11} weight="bold" />}
                    label={`Remove dependency on ${dep.task.title}`}
                    onConfirm={() => removeMutation.mutate(dep.dependencyId)}
                  />
                </div>
              ))}
            </div>
          )}
          {dependencies.blocking.length > 0 && (
            <div className="task-dependency-group">
              <span className="task-dependency-group__label">Blocking</span>
              {dependencies.blocking.map((dep) => (
                <div className="task-dependency-item" key={dep.dependencyId}>
                  <span
                    className={
                      dep.task.completed
                        ? "task-dependency-item__title is-done"
                        : "task-dependency-item__title"
                    }
                  >
                    {dep.task.title}
                  </span>
                  <ConfirmIconButton
                    icon={<X size={11} weight="bold" />}
                    label={`Remove dependency from ${dep.task.title}`}
                    onConfirm={() => removeMutation.mutate(dep.dependencyId)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {adding ? (
        <div className="task-dependency-add">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tasks in this project…"
            autoFocus
          />
          <div className="task-dependency-add__results">
            {candidates.slice(0, 8).map((task) => (
              <button type="button" key={task.id} onClick={() => addMutation.mutate(task.id)}>
                {task.title}
              </button>
            ))}
            {candidates.length === 0 && <p className="task-dependency-add__empty">No matches.</p>}
          </div>
          <button
            type="button"
            className="task-panel__add-project"
            onClick={() => {
              setAdding(false);
              setSearch("");
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" className="task-panel__add-project" onClick={() => setAdding(true)}>
          Add dependency
        </button>
      )}
    </div>
  );
}
