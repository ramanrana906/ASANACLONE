import { createReadStream } from "node:fs";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { Attachment } from "@asanaClone/shared";
import { db } from "../db";
import { attachments, users } from "../db/schema";
import { requireTaskAccess } from "../lib/taskAccess";
import { absoluteAttachmentPath, deleteAttachmentFile, saveUploadedFile } from "../lib/attachmentStorage";

const taskIdParamsSchema = z.object({ id: z.coerce.number() });
const attachmentIdParamsSchema = z.object({ id: z.coerce.number() });

function toPublicAttachment(
  row: typeof attachments.$inferSelect,
  uploader: { id: number; name: string; email: string },
): Attachment {
  return {
    id: row.id,
    taskId: row.taskId,
    uploadedBy: uploader,
    fileName: row.fileName,
    fileUrl: `/api/attachments/${row.id}/download`,
    fileSize: row.fileSize,
    mimeType: row.mimeType,
    createdAt: row.createdAt.toISOString(),
  };
}

async function requireAttachmentAccess(attachmentId: number, userId: number) {
  const attachment = await db.query.attachments.findFirst({ where: eq(attachments.id, attachmentId) });
  if (!attachment) return null;
  const access = await requireTaskAccess(attachment.taskId, userId);
  if (!access) return null;
  return { attachment, access };
}

export const attachmentsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/api/tasks/:id/attachments",
    { schema: { params: taskIdParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const access = await requireTaskAccess(request.params.id, request.user.sub);
      if (!access) {
        return reply.status(404).send({ error: "Task not found" });
      }

      const file = await request.file();
      if (!file) {
        return reply.status(400).send({ error: "No file provided" });
      }

      const { relativePath, size } = await saveUploadedFile(file.file, file.filename);
      if (file.file.truncated) {
        await deleteAttachmentFile(relativePath);
        return reply.status(413).send({ error: "File is larger than the 20MB limit" });
      }

      const [row] = await db
        .insert(attachments)
        .values({
          taskId: access.task.id,
          uploadedBy: request.user.sub,
          fileName: file.filename,
          fileUrl: relativePath,
          fileSize: size,
          mimeType: file.mimetype,
        })
        .returning();

      const uploader = await db.query.users.findFirst({ where: eq(users.id, request.user.sub) });

      return reply.status(201).send(toPublicAttachment(row, uploader!));
    },
  );

  app.get(
    "/api/tasks/:id/attachments",
    { schema: { params: taskIdParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const access = await requireTaskAccess(request.params.id, request.user.sub);
      if (!access) {
        return reply.status(404).send({ error: "Task not found" });
      }

      const rows = await db
        .select({ attachment: attachments, uploader: users })
        .from(attachments)
        .innerJoin(users, eq(attachments.uploadedBy, users.id))
        .where(eq(attachments.taskId, access.task.id))
        .orderBy(asc(attachments.createdAt));

      return reply.send(rows.map((row) => toPublicAttachment(row.attachment, row.uploader)));
    },
  );

  app.get(
    "/api/attachments/:id/download",
    { schema: { params: attachmentIdParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const result = await requireAttachmentAccess(request.params.id, request.user.sub);
      if (!result) {
        return reply.status(404).send({ error: "Attachment not found" });
      }

      reply.header(
        "Content-Disposition",
        `attachment; filename="${result.attachment.fileName.replace(/"/g, "")}"`,
      );
      reply.type(result.attachment.mimeType);
      return reply.send(createReadStream(absoluteAttachmentPath(result.attachment.fileUrl)));
    },
  );

  app.delete(
    "/api/attachments/:id",
    { schema: { params: attachmentIdParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const result = await requireAttachmentAccess(request.params.id, request.user.sub);
      if (!result) {
        return reply.status(404).send({ error: "Attachment not found" });
      }

      await deleteAttachmentFile(result.attachment.fileUrl);
      await db.delete(attachments).where(eq(attachments.id, result.attachment.id));

      return reply.send({ ok: true });
    },
  );
};
