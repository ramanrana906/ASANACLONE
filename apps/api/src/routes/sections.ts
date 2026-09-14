import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  createSectionSchema,
  updateSectionSchema,
  reorderSectionsSchema,
  type Section,
} from "@asanaClone/shared";
import { db } from "../db";
import { sections, taskProjects } from "../db/schema";
import { requireProjectAccess } from "../policies/projectAccess";

const projectIdParamsSchema = z.object({ id: z.coerce.number() });
const sectionIdParamsSchema = z.object({ id: z.coerce.number() });

function toPublicSection(row: typeof sections.$inferSelect): Section {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    position: row.position,
    createdAt: row.createdAt.toISOString(),
  };
}

async function requireSectionAccess(sectionId: number, userId: number) {
  const section = await db.query.sections.findFirst({ where: eq(sections.id, sectionId) });
  if (!section) return null;
  const project = await requireProjectAccess(section.projectId, userId);
  if (!project) return null;
  return { section, project };
}

export const sectionsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/api/projects/:id/sections",
    {
      schema: { params: projectIdParamsSchema, body: createSectionSchema },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const project = await requireProjectAccess(request.params.id, request.user.sub);
      if (!project) {
        return reply.status(404).send({ error: "Project not found" });
      }

      const existing = await db
        .select()
        .from(sections)
        .where(eq(sections.projectId, project.id));
      const nextPosition =
        existing.length === 0 ? 0 : Math.max(...existing.map((s) => s.position)) + 1;

      const [section] = await db
        .insert(sections)
        .values({ projectId: project.id, name: request.body.name, position: nextPosition })
        .returning();

      return reply.status(201).send(toPublicSection(section));
    },
  );

  app.get(
    "/api/projects/:id/sections",
    { schema: { params: projectIdParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const project = await requireProjectAccess(request.params.id, request.user.sub);
      if (!project) {
        return reply.status(404).send({ error: "Project not found" });
      }

      const rows = await db
        .select()
        .from(sections)
        .where(eq(sections.projectId, project.id))
        .orderBy(asc(sections.position));

      return reply.send(rows.map(toPublicSection));
    },
  );

  app.patch(
    "/api/sections/:id",
    {
      schema: { params: sectionIdParamsSchema, body: updateSectionSchema },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const access = await requireSectionAccess(request.params.id, request.user.sub);
      if (!access) {
        return reply.status(404).send({ error: "Section not found" });
      }

      const [updated] = await db
        .update(sections)
        .set({ name: request.body.name })
        .where(eq(sections.id, access.section.id))
        .returning();

      return reply.send(toPublicSection(updated));
    },
  );

  app.delete(
    "/api/sections/:id",
    { schema: { params: sectionIdParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const access = await requireSectionAccess(request.params.id, request.user.sub);
      if (!access) {
        return reply.status(404).send({ error: "Section not found" });
      }

      const remainingTasks = await db
        .select()
        .from(taskProjects)
        .where(eq(taskProjects.sectionId, access.section.id));
      if (remainingTasks.length > 0) {
        return reply
          .status(400)
          .send({ error: "Move or delete this section's tasks before deleting it" });
      }

      await db.delete(sections).where(eq(sections.id, access.section.id));
      return reply.send({ ok: true });
    },
  );

  app.patch(
    "/api/projects/:id/sections/reorder",
    {
      schema: { params: projectIdParamsSchema, body: reorderSectionsSchema },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const project = await requireProjectAccess(request.params.id, request.user.sub);
      if (!project) {
        return reply.status(404).send({ error: "Project not found" });
      }

      const existing = await db
        .select()
        .from(sections)
        .where(eq(sections.projectId, project.id));
      const existingIds = new Set(existing.map((s) => s.id));
      const { sectionIds } = request.body;

      if (sectionIds.length !== existing.length || !sectionIds.every((id) => existingIds.has(id))) {
        return reply.status(400).send({ error: "sectionIds must match this project's sections" });
      }

      await Promise.all(
        sectionIds.map((id, index) =>
          db.update(sections).set({ position: index }).where(eq(sections.id, id)),
        ),
      );

      const rows = await db
        .select()
        .from(sections)
        .where(eq(sections.projectId, project.id))
        .orderBy(asc(sections.position));

      return reply.send(rows.map(toPublicSection));
    },
  );
};
