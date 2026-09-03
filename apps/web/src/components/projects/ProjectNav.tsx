import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "@phosphor-icons/react";
import { createProject, listProjects } from "../../lib/projects";
import { ProjectIcon } from "../common/ProjectIcon";

interface ProjectNavProps {
  workspaceId: number;
  selectedProjectId: number | null;
  onSelect: (projectId: number) => void;
  collapsed?: boolean;
}

export function ProjectNav({
  workspaceId,
  selectedProjectId,
  onSelect,
  collapsed = false,
}: ProjectNavProps) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

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
      onSelect(project.id);
    },
  });

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate(name.trim());
  }

  return (
    <div className="project-nav">
      {!collapsed && <div className="project-nav__label">Projects</div>}
      <ul className="project-nav__list">
        {projects.map((project) => (
          <li key={project.id}>
            <button
              type="button"
              className={project.id === selectedProjectId ? "is-active" : ""}
              onClick={() => onSelect(project.id)}
              title={project.name}
            >
              <ProjectIcon projectKey={project.id} size={16} />
              {!collapsed && <span>{project.name}</span>}
            </button>
          </li>
        ))}
      </ul>

      {!collapsed &&
        (creating ? (
          <form className="project-nav__create-form" onSubmit={handleCreate}>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Project name"
              autoFocus
              onBlur={() => {
                if (!name.trim()) setCreating(false);
              }}
            />
          </form>
        ) : (
          <button type="button" className="project-nav__new" onClick={() => setCreating(true)}>
            <Plus size={14} weight="bold" />
            <span>New project</span>
          </button>
        ))}
    </div>
  );
}
