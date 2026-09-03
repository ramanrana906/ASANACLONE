import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderPlus, Plus, Rows, SquaresFour } from "@phosphor-icons/react";
import type { Project } from "@asanaClone/shared";
import { createProject, listProjectMembers, listProjects } from "../../lib/projects";
import { ProjectIcon } from "../common/ProjectIcon";
import { AvatarStack } from "../common/AvatarStack";
import { STATUS_LABEL, STATUS_DOT_CLASS } from "./status";

const VIEW_KEY = "clearing.projectsView";
type View = "grid" | "table";

interface ProjectsListProps {
  workspaceId: number;
  workspaceName: string;
  onOpenProject: (projectId: number) => void;
}

function useProjectMembers(projectId: number) {
  const query = useQuery({
    queryKey: ["projects", projectId, "members"],
    queryFn: () => listProjectMembers(projectId),
  });
  return query.data ?? [];
}

function ProjectCard({ project, onOpen }: { project: Project; onOpen: () => void }) {
  const members = useProjectMembers(project.id);
  return (
    <button type="button" className="project-card" onClick={onOpen}>
      <div className="project-card__top">
        <ProjectIcon projectKey={project.id} size={32} />
        {project.status && (
          <span className={`project-status-dot ${STATUS_DOT_CLASS[project.status]}`} />
        )}
        {project.status && <span className="project-card__status">{STATUS_LABEL[project.status]}</span>}
      </div>
      <span className="project-card__name">{project.name}</span>
      {project.description && (
        <span className="project-card__description">{project.description}</span>
      )}
      {members.length > 0 && (
        <div className="project-card__footer">
          <AvatarStack people={members.map((m) => ({ id: m.userId, name: m.name }))} size={22} max={4} />
        </div>
      )}
    </button>
  );
}

function ProjectRow({ project, onOpen }: { project: Project; onOpen: () => void }) {
  const members = useProjectMembers(project.id);
  const created = new Date(project.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <button type="button" className="projects-list__table-row" onClick={onOpen}>
      <span className="projects-list__table-name">
        <ProjectIcon projectKey={project.id} size={18} />
        {project.name}
      </span>
      <span>
        {project.status ? (
          <span className="projects-list__table-status">
            <span className={`project-status-dot ${STATUS_DOT_CLASS[project.status]}`} />
            {STATUS_LABEL[project.status]}
          </span>
        ) : (
          <span className="projects-list__table-muted">—</span>
        )}
      </span>
      <span>
        {members.length > 0 ? (
          <AvatarStack people={members.map((m) => ({ id: m.userId, name: m.name }))} size={20} max={3} />
        ) : (
          <span className="projects-list__table-muted">—</span>
        )}
      </span>
      <span className="projects-list__table-muted">{created}</span>
    </button>
  );
}

export function ProjectsList({ workspaceId, workspaceName, onOpenProject }: ProjectsListProps) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [view, setView] = useState<View>(() => (localStorage.getItem(VIEW_KEY) as View) || "grid");

  const projectsQuery = useQuery({
    queryKey: ["workspaces", workspaceId, "projects"],
    queryFn: () => listProjects(workspaceId),
  });
  const projects = projectsQuery.data ?? [];

  const createMutation = useMutation({
    mutationFn: (name: string) => createProject(workspaceId, { name }),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces", workspaceId, "projects"] });
      setName("");
      setCreating(false);
      onOpenProject(project.id);
    },
  });

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate(name.trim());
  }

  function changeView(next: View) {
    setView(next);
    localStorage.setItem(VIEW_KEY, next);
  }

  return (
    <div className="projects-list">
      <div className="projects-list__header">
        <div>
          <p className="projects-list__eyebrow">{workspaceName}</p>
          <h1>Projects</h1>
        </div>
        <div className="projects-list__header-actions">
          {projects.length > 0 && (
            <div className="view-toggle" role="group" aria-label="Layout">
              <button
                type="button"
                className={view === "grid" ? "is-active" : ""}
                onClick={() => changeView("grid")}
                title="Grid view"
                aria-label="Grid view"
              >
                <SquaresFour size={16} weight="bold" />
              </button>
              <button
                type="button"
                className={view === "table" ? "is-active" : ""}
                onClick={() => changeView("table")}
                title="Table view"
                aria-label="Table view"
              >
                <Rows size={16} weight="bold" />
              </button>
            </div>
          )}
          <button
            type="button"
            className="auth-form__primary-button projects-list__new-button"
            onClick={() => setCreating(true)}
          >
            <Plus size={16} weight="bold" style={{ marginRight: 6, verticalAlign: -2 }} />
            New project
          </button>
        </div>
      </div>

      {creating && (
        <form className="projects-list__create-form" onSubmit={handleCreate}>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Project name"
            autoFocus
          />
          <button type="submit" disabled={createMutation.isPending || !name.trim()}>
            {createMutation.isPending ? "Creating…" : "Create"}
          </button>
          <button type="button" onClick={() => setCreating(false)}>
            Cancel
          </button>
        </form>
      )}

      {projects.length === 0 && !creating && (
        <div className="projects-list__empty">
          <span className="projects-list__empty-icon">
            <FolderPlus size={22} weight="bold" />
          </span>
          <div>
            <p className="projects-list__empty-title">No projects yet</p>
            <p className="projects-list__empty-copy">
              Create a project to start organizing tasks with your team.
            </p>
          </div>
          <button type="button" className="auth-form__primary-button" onClick={() => setCreating(true)}>
            Create your first project
          </button>
        </div>
      )}

      {projects.length > 0 && view === "grid" && (
        <div className="projects-list__grid">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} onOpen={() => onOpenProject(project.id)} />
          ))}
        </div>
      )}

      {projects.length > 0 && view === "table" && (
        <div className="projects-list__table">
          <div className="projects-list__table-head">
            <span>Name</span>
            <span>Status</span>
            <span>Members</span>
            <span>Created</span>
          </div>
          {projects.map((project) => (
            <ProjectRow key={project.id} project={project} onOpen={() => onOpenProject(project.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
