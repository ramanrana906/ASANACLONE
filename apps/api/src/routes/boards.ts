import { createBoardSchema } from "@asanaClone/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { db } from "../db";
import { boards } from "../db/schema";

export const boardsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/api/boards",
    { schema: { body: createBoardSchema } },
    async (request, reply) => {
      const [board] = await db
        .insert(boards)
        .values({ title: request.body.title })
        .returning();

      return reply.status(201).send(board);
    },
  );
};
