import { useQuery } from "@tanstack/react-query";
import { CaretRight, MagnifyingGlass } from "@phosphor-icons/react";
import { getProject } from "../../lib/projects";

interface TopBarProps {
  workspaceName: string;
  projectId: number | null;
  onOpenSearch: () => void;
}

const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform);

export function TopBar({ workspaceName, projectId, onOpenSearch }: TopBarProps) {
  const projectQuery = useQuery({
    queryKey: ["projects", projectId],
    queryFn: () => getProject(projectId as number),
    enabled: projectId !== null,
  });

  return (
    <header className="top-bar">
      <div className="top-bar__breadcrumb">
        <span>{workspaceName}</span>
        {projectQuery.data && (
          <>
            <CaretRight size={11} weight="bold" className="top-bar__crumb-sep" />
            <span className="top-bar__crumb-current">{projectQuery.data.name}</span>
          </>
        )}
      </div>
      <button type="button" className="top-bar__search" onClick={onOpenSearch}>
        <MagnifyingGlass size={15} weight="bold" />
        <span>Search projects, people…</span>
        <kbd>{isMac ? "⌘K" : "Ctrl K"}</kbd>
      </button>
    </header>
  );
}
