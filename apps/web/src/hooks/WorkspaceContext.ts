import { createContext, useContext } from "react";
import type { CreateWorkspaceInput, UpdateWorkspaceInput, Workspace } from "@asanaClone/shared";

export const WORKSPACES_QUERY_KEY = ["workspaces"] as const;

export interface WorkspaceContextValue {
  workspaces: Workspace[];
  isLoading: boolean;
  currentWorkspace: Workspace | undefined;
  switchWorkspace: (id: number) => void;

  createWorkspace: (input: CreateWorkspaceInput) => Promise<Workspace>;
  isCreatePending: boolean;
  createError: Error | null;

  updateWorkspace: (id: number, input: UpdateWorkspaceInput) => Promise<Workspace>;
  deleteWorkspace: (id: number) => Promise<void>;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspaces() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspaces must be used within a WorkspaceProvider");
  }
  return context;
}
