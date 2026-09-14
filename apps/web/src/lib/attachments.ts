import type { Attachment } from "@asanaClone/shared";
import { API_URL, apiFetch } from "./api";

export function listAttachments(taskId: number) {
  return apiFetch<Attachment[]>(`/api/tasks/${taskId}/attachments`);
}

export async function uploadAttachment(taskId: number, file: File): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/api/tasks/${taskId}/attachments`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      message = JSON.parse(text).error ?? text;
    } catch {
      // not JSON, fall back to raw text
    }
    throw new Error(message || `Upload failed (${res.status})`);
  }

  return res.json();
}

export function deleteAttachment(attachmentId: number) {
  return apiFetch<{ ok: boolean }>(`/api/attachments/${attachmentId}`, { method: "DELETE" });
}

export function attachmentDownloadUrl(attachment: Attachment): string {
  return `${API_URL}${attachment.fileUrl}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
