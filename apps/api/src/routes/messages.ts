import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { createMessageSchema, type Message } from "@asanaClone/shared";
import { db } from "../db";
import { messages, users } from "../db/schema";
import { requireProjectAccess } from "../lib/projectAccess";

const projectIdParamsSchema = z.object({ id: z.coerce.number() });

export const messagesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/api/projects/:id/messages",
    {
      schema: { params: projectIdParamsSchema, body: createMessageSchema },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const project = await requireProjectAccess(request.params.id, request.user.sub);
      if (!project) {
        return reply.status(404).send({ error: "Project not found" });
      }

      const [message] = await db
        .insert(messages)
        .values({ projectId: project.id, authorId: request.user.sub, body: request.body.body })
        .returning();

      const author = await db.query.users.findFirst({ where: eq(users.id, message.authorId) });

      const result: Message = {
        id: message.id,
        projectId: message.projectId,
        author: { id: author!.id, name: author!.name, email: author!.email },
        body: message.body,
        createdAt: message.createdAt.toISOString(),
        editedAt: message.editedAt ? message.editedAt.toISOString() : null,
      };

      return reply.status(201).send(result);
    },
  );

  app.get(
    "/api/projects/:id/messages",
    { schema: { params: projectIdParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const project = await requireProjectAccess(request.params.id, request.user.sub);
      if (!project) {
        return reply.status(404).send({ error: "Project not found" });
      }

      const rows = await db
        .select({ message: messages, author: users })
        .from(messages)
        .innerJoin(users, eq(messages.authorId, users.id))
        .where(eq(messages.projectId, project.id))
        .orderBy(asc(messages.createdAt));

      const result: Message[] = rows.map((row) => ({
        id: row.message.id,
        projectId: row.message.projectId,
        author: { id: row.author.id, name: row.author.name, email: row.author.email },
        body: row.message.body,
        createdAt: row.message.createdAt.toISOString(),
        editedAt: row.message.editedAt ? row.message.editedAt.toISOString() : null,
      }));

      return reply.send(result);
    },
  );
};
