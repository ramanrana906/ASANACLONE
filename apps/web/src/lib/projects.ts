import type {
  AddProjectMemberInput,
  CreateProjectInput,
  Project,
  ProjectMember,
  UpdateProjectInput,
  UpdateProjectStatusInput,
} from "@asanaClone/shared";
import { apiFetch } from "./api";

export function listProjects(workspaceId: number) {
  return apiFetch<Project[]>(`/api/workspaces/${workspaceId}/projects`);
}

export function createProject(workspaceId: number, input: CreateProjectInput) {
  return apiFetch<Project>(`/api/workspaces/${workspaceId}/projects`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getProject(projectId: number) {
  return apiFetch<Project>(`/api/projects/${projectId}`);
}

export function updateProject(projectId: number, input: UpdateProjectInput) {
  return apiFetch<Project>(`/api/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function updateProjectStatus(projectId: number, input: UpdateProjectStatusInput) {
  return apiFetch<Project>(`/api/projects/${projectId}/status`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteProject(projectId: number) {
  return apiFetch<{ ok: boolean }>(`/api/projects/${projectId}`, { method: "DELETE" });
}

export function listProjectMembers(projectId: number) {
  return apiFetch<ProjectMember[]>(`/api/projects/${projectId}/members`);
}

export function addProjectMember(projectId: number, input: AddProjectMemberInput) {
  return apiFetch<{ ok: boolean }>(`/api/projects/${projectId}/members`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function removeProjectMember(projectId: number, userId: number) {
  return apiFetch<{ ok: boolean }>(`/api/projects/${projectId}/members/${userId}`, {
    method: "DELETE",
  });
}
