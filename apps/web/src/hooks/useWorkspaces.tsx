import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createWorkspace,
  deleteWorkspace,
  listWorkspaces,
  updateWorkspace,
} from "../lib/workspaces";
import {
  WORKSPACES_QUERY_KEY,
  WorkspaceContext,
  type WorkspaceContextValue,
} from "./WorkspaceContext";

const CURRENT_WORKSPACE_KEY = "clearing.currentWorkspaceId";

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const stored = localStorage.getItem(CURRENT_WORKSPACE_KEY);
    return stored ? Number(stored) : null;
  });

  const workspacesQuery = useQuery({
    queryKey: WORKSPACES_QUERY_KEY,
    queryFn: listWorkspaces,
  });
  const workspaces = workspacesQuery.data ?? [];

  // Fall back to the first workspace whenever the stored selection no longer
  // exists (first load, or the selected workspace was deleted) — derived at
  // render time rather than synced via an effect.
  const currentWorkspaceId = workspaces.some((w) => w.id === selectedId)
    ? selectedId
    : (workspaces[0]?.id ?? null);
  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId);

  function switchWorkspace(id: number) {
    setSelectedId(id);
    localStorage.setItem(CURRENT_WORKSPACE_KEY, String(id));
  }

  const createMutation = useMutation({
    mutationFn: createWorkspace,
    onSuccess: (workspace) => {
      queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY });
      switchWorkspace(workspace.id);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: Parameters<typeof updateWorkspace>[1] }) =>
      updateWorkspace(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorkspace,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY }),
  });

  const value: WorkspaceContextValue = {
    workspaces,
    isLoading: workspacesQuery.isLoading,
    currentWorkspace,
    switchWorkspace,
    createWorkspace: (input) => createMutation.mutateAsync(input),
    isCreatePending: createMutation.isPending,
    createError: createMutation.error,
    updateWorkspace: (id, input) => updateMutation.mutateAsync({ id, input }),
    deleteWorkspace: async (id) => {
      await deleteMutation.mutateAsync(id);
    },
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
