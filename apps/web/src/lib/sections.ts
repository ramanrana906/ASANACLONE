import type {
  CreateSectionInput,
  ReorderSectionsInput,
  Section,
  UpdateSectionInput,
} from "@asanaClone/shared";
import { apiFetch } from "./api";

export function listSections(projectId: number) {
  return apiFetch<Section[]>(`/api/projects/${projectId}/sections`);
}

export function createSection(projectId: number, input: CreateSectionInput) {
  return apiFetch<Section>(`/api/projects/${projectId}/sections`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateSection(sectionId: number, input: UpdateSectionInput) {
  return apiFetch<Section>(`/api/sections/${sectionId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteSection(sectionId: number) {
  return apiFetch<{ ok: boolean }>(`/api/sections/${sectionId}`, { method: "DELETE" });
}

export function reorderSections(projectId: number, input: ReorderSectionsInput) {
  return apiFetch<Section[]>(`/api/projects/${projectId}/sections/reorder`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
