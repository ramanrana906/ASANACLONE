import { useState } from "react";
import { ArrowLeft } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { getProject } from "../../lib/projects";
import { ProjectIcon } from "../common/ProjectIcon";
import { OverviewTab } from "./OverviewTab";

type Tab = "overview" | "list" | "board" | "timeline" | "dashboard" | "calendar";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "list", label: "List" },
  { key: "board", label: "Board" },
  { key: "timeline", label: "Timeline" },
  { key: "dashboard", label: "Dashboard" },
  { key: "calendar", label: "Calendar" },
];

interface ProjectPageProps {
  projectId: number;
  onBack: () => void;
}

export function ProjectPage({ projectId, onBack }: ProjectPageProps) {
  const [tab, setTab] = useState<Tab>("overview");
  const projectQuery = useQuery({
    queryKey: ["projects", projectId],
    queryFn: () => getProject(projectId),
  });

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
        ) : (
          <p className="project-page__coming-soon">
            {TABS.find((t) => t.key === tab)?.label} view is coming in a later sprint.
          </p>
        )}
      </div>
    </div>
  );
}
