import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { listProjects } from "../../lib/projects";
import { listMembers } from "../../lib/members";
import { search as searchWorkspace } from "../../lib/search";
import { ProjectIcon } from "../common/ProjectIcon";
import { Avatar } from "../common/Avatar";

interface CommandPaletteProps {
  workspaceId: number;
  onClose: () => void;
  onSelectProject: (projectId: number) => void;
  onSelectPerson: () => void;
  onSelectTask: (projectId: number, taskId: number) => void;
}

type PaletteItem =
  | { kind: "project"; id: number; name: string }
  | { kind: "person"; id: number; name: string }
  | { kind: "task"; id: number; name: string; projectId: number; projectName: string };

export function CommandPalette({
  workspaceId,
  onClose,
  onSelectProject,
  onSelectPerson,
  onSelectTask,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const projectsQuery = useQuery({
    queryKey: ["workspaces", workspaceId, "projects"],
    queryFn: () => listProjects(workspaceId),
  });
  const membersQuery = useQuery({
    queryKey: ["workspaces", workspaceId, "members"],
    queryFn: () => listMembers(workspaceId),
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const needle = query.trim().toLowerCase();

  const searchQuery = useQuery({
    queryKey: ["search", workspaceId, needle],
    queryFn: () => searchWorkspace(workspaceId, needle),
    enabled: needle.length > 0,
  });

  const filteredProjects = useMemo(
    () => (projectsQuery.data ?? []).filter((p) => p.name.toLowerCase().includes(needle)),
    [projectsQuery.data, needle],
  );
  const filteredMembers = useMemo(
    () => (membersQuery.data ?? []).filter((m) => m.name.toLowerCase().includes(needle)),
    [membersQuery.data, needle],
  );
  const taskResults = needle.length > 0 ? (searchQuery.data?.tasks ?? []) : [];

  const items: PaletteItem[] = useMemo(
    () => [
      ...filteredProjects.map((p) => ({ kind: "project" as const, id: p.id, name: p.name })),
      ...taskResults.map((t) => ({
        kind: "task" as const,
        id: t.id,
        name: t.title,
        projectId: t.projectId,
        projectName: t.projectName,
      })),
      ...filteredMembers.map((m) => ({ kind: "person" as const, id: m.userId, name: m.name })),
    ],
    [filteredProjects, taskResults, filteredMembers],
  );

  function select(item: PaletteItem) {
    if (item.kind === "project") onSelectProject(item.id);
    else if (item.kind === "task") onSelectTask(item.projectId, item.id);
    else onSelectPerson();
    onClose();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      onClose();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = items[activeIndex];
      if (item) select(item);
    }
  }

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="command-palette__input-row">
          <MagnifyingGlass size={17} weight="bold" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search projects, people…"
          />
          <button type="button" onClick={onClose} aria-label="Close search">
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className="command-palette__results">
          {items.length === 0 && <p className="command-palette__empty">No matches.</p>}

          {filteredProjects.length > 0 && (
            <div className="command-palette__group">
              <span className="command-palette__group-label">Projects</span>
              {filteredProjects.map((project) => {
                const index = items.findIndex(
                  (item) => item.kind === "project" && item.id === project.id,
                );
                return (
                  <button
                    type="button"
                    key={project.id}
                    className={index === activeIndex ? "is-active" : ""}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => select({ kind: "project", id: project.id, name: project.name })}
                  >
                    <ProjectIcon projectKey={project.id} size={20} />
                    <span>{project.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {taskResults.length > 0 && (
            <div className="command-palette__group">
              <span className="command-palette__group-label">Tasks</span>
              {taskResults.map((task) => {
                const index = items.findIndex(
                  (item) => item.kind === "task" && item.id === task.id,
                );
                return (
                  <button
                    type="button"
                    key={task.id}
                    className={index === activeIndex ? "is-active" : ""}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() =>
                      select({
                        kind: "task",
                        id: task.id,
                        name: task.title,
                        projectId: task.projectId,
                        projectName: task.projectName,
                      })
                    }
                  >
                    <span className={task.completed ? "command-palette__task-done" : ""}>
                      {task.title}
                    </span>
                    <span className="command-palette__task-project">{task.projectName}</span>
                  </button>
                );
              })}
            </div>
          )}

          {filteredMembers.length > 0 && (
            <div className="command-palette__group">
              <span className="command-palette__group-label">People</span>
              {filteredMembers.map((member) => {
                const index = items.findIndex(
                  (item) => item.kind === "person" && item.id === member.userId,
                );
                return (
                  <button
                    type="button"
                    key={member.userId}
                    className={index === activeIndex ? "is-active" : ""}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() =>
                      select({ kind: "person", id: member.userId, name: member.name })
                    }
                  >
                    <Avatar name={member.name} userKey={member.userId} size={20} />
                    <span>{member.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
