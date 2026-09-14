import { useEffect, useState } from "react";
import { ArrowLeft } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { getProject } from "../../lib/projects";
import { ProjectIcon } from "../common/ProjectIcon";
import { OverviewTab } from "./OverviewTab";
import { BoardTab } from "./BoardTab";
import { ListTab } from "./ListTab";
import { CalendarTab } from "./CalendarTab";
import { MessagesTab } from "./MessagesTab";
import { TaskDetailPanel } from "../tasks/TaskDetailPanel";

type Tab = "overview" | "list" | "board" | "timeline" | "dashboard" | "calendar" | "messages";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "list", label: "List" },
  { key: "board", label: "Board" },
  { key: "timeline", label: "Timeline" },
  { key: "dashboard", label: "Dashboard" },
  { key: "calendar", label: "Calendar" },
  { key: "messages", label: "Messages" },
];

interface ProjectPageProps {
  projectId: number;
  onBack: () => void;
  initialTaskId?: number | null;
}

export function ProjectPage({ projectId, onBack, initialTaskId }: ProjectPageProps) {
  const [tab, setTab] = useState<Tab>("overview");
  const [jumpTaskId, setJumpTaskId] = useState<number | null>(null);
  const projectQuery = useQuery({
    queryKey: ["projects", projectId],
    queryFn: () => getProject(projectId),
  });

  useEffect(() => {
    if (initialTaskId != null) setJumpTaskId(initialTaskId);
  }, [initialTaskId]);

  if (projectQuery.isLoading) {
    return (
      <div className="app-main">
        <p aria-live="polite">Loading…</p>
      </div>
    );
  }

  if (!projectQuery.data) {
    return (
      <div className="app-main">
        <p role="alert">Project not found.</p>
      </div>
    );
  }

  const project = projectQuery.data;

  return (
    <div className="project-page">
      <div className="project-page__header">
        <button type="button" className="project-page__back" onClick={onBack} aria-label="Back to projects">
          <ArrowLeft size={18} weight="bold" />
        </button>
        <ProjectIcon projectKey={project.id} size={30} />
        <h1>{project.name}</h1>
      </div>
      <nav className="project-page__tabs">
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
      <div className="project-page__content">
        {tab === "overview" ? (
          <OverviewTab project={project} />
        ) : tab === "board" ? (
          <BoardTab projectId={project.id} workspaceId={project.workspaceId} />
        ) : tab === "list" ? (
          <ListTab projectId={project.id} workspaceId={project.workspaceId} />
        ) : tab === "calendar" ? (
          <CalendarTab projectId={project.id} workspaceId={project.workspaceId} />
        ) : tab === "messages" ? (
          <MessagesTab projectId={project.id} />
        ) : (
          <p className="project-page__coming-soon">
            {TABS.find((t) => t.key === tab)?.label} view is coming in a later sprint.
          </p>
        )}
      </div>
      {jumpTaskId !== null && (
        <TaskDetailPanel
          taskId={jumpTaskId}
          workspaceId={project.workspaceId}
          onClose={() => setJumpTaskId(null)}
        />
      )}
    </div>
  );
}
