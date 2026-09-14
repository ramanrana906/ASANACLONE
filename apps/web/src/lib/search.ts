import type { SearchResults } from "@asanaClone/shared";
import { apiFetch } from "./api";

export function search(workspaceId: number, q: string) {
  const params = new URLSearchParams({ workspaceId: String(workspaceId), q });
  return apiFetch<SearchResults>(`/api/search?${params.toString()}`);
}
