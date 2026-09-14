import type {
  CreateCustomFieldInput,
  CustomField,
  SetCustomFieldValuesInput,
  UpdateCustomFieldInput,
} from "@asanaClone/shared";
import { apiFetch } from "./api";

export function listCustomFields(projectId: number) {
  return apiFetch<CustomField[]>(`/api/projects/${projectId}/custom-fields`);
}

export function createCustomField(projectId: number, input: CreateCustomFieldInput) {
  return apiFetch<CustomField>(`/api/projects/${projectId}/custom-fields`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCustomField(fieldId: number, input: UpdateCustomFieldInput) {
  return apiFetch<CustomField>(`/api/custom-fields/${fieldId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteCustomField(fieldId: number) {
  return apiFetch<{ ok: boolean }>(`/api/custom-fields/${fieldId}`, { method: "DELETE" });
}

export function setCustomFieldValues(taskId: number, input: SetCustomFieldValuesInput) {
  return apiFetch<{ ok: boolean }>(`/api/tasks/${taskId}/custom-field-values`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}
