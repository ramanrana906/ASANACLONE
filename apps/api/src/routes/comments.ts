import { asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { createCommentSchema, type Comment } from "@asanaClone/shared";
import { db } from "../db";
import { comments, users, workspaceMembers } from "../db/schema";
import { requireTaskAccess } from "../policies/taskAccess";
import { createNotification, getTaskFollowerIds } from "../services/notifications";

const taskIdParamsSchema = z.object({ id: z.coerce.number() });

export const commentsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/api/tasks/:id/comments",
    {
      schema: { params: taskIdParamsSchema, body: createCommentSchema },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const access = await requireTaskAccess(request.params.id, request.user.sub);
      if (!access) {
        return reply.status(404).send({ error: "Task not found" });
      }

      const [comment] = await db
        .insert(comments)
        .values({ taskId: access.task.id, authorId: request.user.sub, body: request.body.body })
        .returning();

      const author = await db.query.users.findFirst({ where: eq(users.id, comment.authorId) });

      const primaryProjectId = access.links[0]?.project.id ?? null;
      const followerIds = await getTaskFollowerIds(access.task.id);
      await Promise.all(
        followerIds.map((userId) =>
          createNotification({
            userId,
            type: "commented",
            actorId: request.user.sub,
            taskId: access.task.id,
            projectId: primaryProjectId,
          }),
        ),
      );

      const workspaceIds = [...new Set(access.links.map(({ project }) => project.workspaceId))];
      if (workspaceIds.length > 0) {
        const memberRows = await db
          .select({ user: users })
          .from(workspaceMembers)
          .innerJoin(users, eq(workspaceMembers.userId, users.id))
          .where(inArray(workspaceMembers.workspaceId, workspaceIds));
        const uniqueMembers = new Map(memberRows.map((row) => [row.user.id, row.user]));
        const mentioned = [...uniqueMembers.values()].filter((member) =>
          comment.body.includes(`@${member.name}`),
        );
        await Promise.all(
          mentioned.map((member) =>
            createNotification({
              userId: member.id,
              type: "mentioned",
              actorId: request.user.sub,
              taskId: access.task.id,
              projectId: primaryProjectId,
            }),
          ),
        );
      }

      const result: Comment = {
        id: comment.id,
        taskId: comment.taskId,
        author: { id: author!.id, name: author!.name, email: author!.email },
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
        editedAt: comment.editedAt ? comment.editedAt.toISOString() : null,
      };

      return reply.status(201).send(result);
    },
  );

  app.get(
    "/api/tasks/:id/comments",
    { schema: { params: taskIdParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const access = await requireTaskAccess(request.params.id, request.user.sub);
      if (!access) {
        return reply.status(404).send({ error: "Task not found" });
      }

      const rows = await db
        .select({ comment: comments, author: users })
        .from(comments)
        .innerJoin(users, eq(comments.authorId, users.id))
        .where(eq(comments.taskId, access.task.id))
        .orderBy(asc(comments.createdAt));

      const result: Comment[] = rows.map((row) => ({
        id: row.comment.id,
        taskId: row.comment.taskId,
        author: { id: row.author.id, name: row.author.name, email: row.author.email },
        body: row.comment.body,
        createdAt: row.comment.createdAt.toISOString(),
        editedAt: row.comment.editedAt ? row.comment.editedAt.toISOString() : null,
      }));

      return reply.send(result);
    },
  );
};
