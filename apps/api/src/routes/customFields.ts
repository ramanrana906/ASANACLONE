import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  createCustomFieldSchema,
  setCustomFieldValuesSchema,
  updateCustomFieldSchema,
  type CustomField,
} from "@asanaClone/shared";
import { db } from "../db";
import { customFields, customFieldValues } from "../db/schema";
import { requireProjectAccess } from "../policies/projectAccess";
import { requireTaskAccess } from "../policies/taskAccess";

const projectIdParamsSchema = z.object({ id: z.coerce.number() });
const customFieldIdParamsSchema = z.object({ id: z.coerce.number() });
const taskIdParamsSchema = z.object({ id: z.coerce.number() });

function toPublicCustomField(row: typeof customFields.$inferSelect): CustomField {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    type: row.type,
    options: row.options ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

async function requireCustomFieldAccess(customFieldId: number, userId: number) {
  const field = await db.query.customFields.findFirst({ where: eq(customFields.id, customFieldId) });
  if (!field) return null;
  const project = await requireProjectAccess(field.projectId, userId);
  if (!project) return null;
  return { field, project };
}

export const customFieldsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/api/projects/:id/custom-fields",
    {
      schema: { params: projectIdParamsSchema, body: createCustomFieldSchema },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const project = await requireProjectAccess(request.params.id, request.user.sub);
      if (!project) {
        return reply.status(404).send({ error: "Project not found" });
      }

      const isSelectType =
        request.body.type === "single_select" || request.body.type === "multi_select";
      if (isSelectType && (!request.body.options || request.body.options.length === 0)) {
        return reply.status(400).send({ error: "Select fields need at least one option" });
      }

      const [field] = await db
        .insert(customFields)
        .values({
          projectId: project.id,
          name: request.body.name,
          type: request.body.type,
          options: isSelectType ? request.body.options : null,
        })
        .returning();

      return reply.status(201).send(toPublicCustomField(field));
    },
  );

  app.get(
    "/api/projects/:id/custom-fields",
    { schema: { params: projectIdParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const project = await requireProjectAccess(request.params.id, request.user.sub);
      if (!project) {
        return reply.status(404).send({ error: "Project not found" });
      }

      const rows = await db
        .select()
        .from(customFields)
        .where(eq(customFields.projectId, project.id));

      return reply.send(rows.map(toPublicCustomField));
    },
  );

  app.patch(
    "/api/custom-fields/:id",
    {
      schema: { params: customFieldIdParamsSchema, body: updateCustomFieldSchema },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const access = await requireCustomFieldAccess(request.params.id, request.user.sub);
      if (!access) {
        return reply.status(404).send({ error: "Custom field not found" });
      }

      const updates: Partial<typeof customFields.$inferInsert> = {};
      if (request.body.name !== undefined) updates.name = request.body.name;
      if (request.body.options !== undefined) updates.options = request.body.options;

      const [updated] = await db
        .update(customFields)
        .set(updates)
        .where(eq(customFields.id, access.field.id))
        .returning();

      return reply.send(toPublicCustomField(updated));
    },
  );

  app.delete(
    "/api/custom-fields/:id",
    { schema: { params: customFieldIdParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const access = await requireCustomFieldAccess(request.params.id, request.user.sub);
      if (!access) {
        return reply.status(404).send({ error: "Custom field not found" });
      }

      await db.delete(customFieldValues).where(eq(customFieldValues.customFieldId, access.field.id));
      await db.delete(customFields).where(eq(customFields.id, access.field.id));

      return reply.send({ ok: true });
    },
  );

  app.put(
    "/api/tasks/:id/custom-field-values",
    {
      schema: { params: taskIdParamsSchema, body: setCustomFieldValuesSchema },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const access = await requireTaskAccess(request.params.id, request.user.sub);
      if (!access) {
        return reply.status(404).send({ error: "Task not found" });
      }

      const belongsToProject = access.links.some(
        ({ link }) => link.projectId === request.body.projectId,
      );
      if (!belongsToProject) {
        return reply.status(400).send({ error: "Task doesn't belong to that project" });
      }

      for (const entry of request.body.values) {
        const field = await db.query.customFields.findFirst({
          where: and(
            eq(customFields.id, entry.customFieldId),
            eq(customFields.projectId, request.body.projectId),
          ),
        });
        if (!field) {
          return reply.status(400).send({ error: "Unknown custom field for this project" });
        }

        const existing = await db.query.customFieldValues.findFirst({
          where: and(
            eq(customFieldValues.customFieldId, entry.customFieldId),
            eq(customFieldValues.taskId, access.task.id),
            eq(customFieldValues.projectId, request.body.projectId),
          ),
        });

        if (existing) {
          await db
            .update(customFieldValues)
            .set({ value: entry.value })
            .where(eq(customFieldValues.id, existing.id));
        } else {
          await db.insert(customFieldValues).values({
            customFieldId: entry.customFieldId,
            taskId: access.task.id,
            projectId: request.body.projectId,
            value: entry.value,
          });
        }
      }

      return reply.send({ ok: true });
    },
  );
};
