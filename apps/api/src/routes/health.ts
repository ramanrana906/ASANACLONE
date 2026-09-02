import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { db } from "../db";
import { boards } from "../db/schema";

export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/api/health", async () => {
    return { message: "API is working" };
  });

  app.get("/api/db-health", async () => {
    const rows = await db.select().from(boards);
    return { ok: true, count: rows.length };
  });
};
