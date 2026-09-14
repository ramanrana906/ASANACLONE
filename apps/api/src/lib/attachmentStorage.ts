import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import type { Readable } from "node:stream";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export async function saveUploadedFile(
  fileStream: Readable,
  originalName: string,
): Promise<{ relativePath: string; size: number }> {
  await mkdir(UPLOADS_DIR, { recursive: true });
  const storedName = `${randomUUID()}-${originalName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const absolutePath = path.join(UPLOADS_DIR, storedName);

  await pipeline(fileStream, createWriteStream(absolutePath));
  const { size } = await stat(absolutePath);

  return { relativePath: path.join("uploads", storedName), size };
}

export function absoluteAttachmentPath(relativePath: string): string {
  return path.join(process.cwd(), relativePath);
}

export async function deleteAttachmentFile(relativePath: string): Promise<void> {
  try {
    await unlink(absoluteAttachmentPath(relativePath));
  } catch {
    // Best-effort: a missing file on disk shouldn't block deleting the DB row.
  }
}
