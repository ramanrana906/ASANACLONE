import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  createProjectSchema,
  updateProjectSchema,
  updateProjectStatusSchema,
  addProjectMemberSchema,
  type Project,
  type ProjectMember,
} from "@asanaClone/shared";
import { db } from "../db";
import { projectMembers, projects, users } from "../db/schema";
import { getMembership } from "../lib/workspaceAccess";

const workspaceIdParamsSchema = z.object({ id: z.coerce.number() });
const projectIdParamsSchema = z.object({ id: z.coerce.number() });
const projectMemberParamsSchema = z.object({ id: z.coerce.number(), userId: z.coerce.number() });

function toPublicProject(row: typeof projects.$inferSelect): Project {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    description: row.description,
    status: row.status,
    ownerId: row.ownerId,
    createdAt: row.createdAt.toISOString(),
  };
}

async function requireWorkspaceMembership(workspaceId: number, userId: number) {
  return getMembership(workspaceId, userId);
}

export const projectsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/api/workspaces/:id/projects",
    {
      schema: { params: workspaceIdParamsSchema, body: createProjectSchema },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const membership = await requireWorkspaceMembership(request.params.id, request.user.sub);
      if (!membership) {
        return reply.status(404).send({ error: "Workspace not found" });
      }

      const [project] = await db
        .insert(projects)
        .values({
          workspaceId: request.params.id,
          name: request.body.name,
          ownerId: request.user.sub,
        })
        .returning();

      await db
        .insert(projectMembers)
        .values({ projectId: project.id, userId: request.user.sub, role: "owner" });

      return reply.status(201).send(toPublicProject(project));
    },
  );

  app.get(
    "/api/workspaces/:id/projects",
    { schema: { params: workspaceIdParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const membership = await requireWorkspaceMembership(request.params.id, request.user.sub);
      if (!membership) {
        return reply.status(404).send({ error: "Workspace not found" });
      }

      const rows = await db.query.projects.findMany({
        where: eq(projects.workspaceId, request.params.id),
      });

      return reply.send(rows.map(toPublicProject));
    },
  );

  app.get(
    "/api/projects/:id",
    { schema: { params: projectIdParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, request.params.id),
      });
      if (!project) {
        return reply.status(404).send({ error: "Project not found" });
      }
      const membership = await requireWorkspaceMembership(project.workspaceId, request.user.sub);
      if (!membership) {
        return reply.status(404).send({ error: "Project not found" });
      }

      return reply.send(toPublicProject(project));
    },
  );

  app.patch(
    "/api/projects/:id",
    {
      schema: { params: projectIdParamsSchema, body: updateProjectSchema },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, request.params.id),
      });
      if (!project) {
        return reply.status(404).send({ error: "Project not found" });
      }
      const membership = await requireWorkspaceMembership(project.workspaceId, request.user.sub);
      if (!membership) {
        return reply.status(404).send({ error: "Project not found" });
      }

      const [updated] = await db
        .update(projects)
        .set(request.body)
        .where(eq(projects.id, project.id))
        .returning();

      return reply.send(toPublicProject(updated));
    },
  );

  app.patch(
    "/api/projects/:id/status",
    {
      schema: { params: projectIdParamsSchema, body: updateProjectStatusSchema },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, request.params.id),
      });
      if (!project) {
        return reply.status(404).send({ error: "Project not found" });
      }
      const membership = await requireWorkspaceMembership(project.workspaceId, request.user.sub);
      if (!membership) {
        return reply.status(404).send({ error: "Project not found" });
      }

      const [updated] = await db
        .update(projects)
        .set({ status: request.body.status })
        .where(eq(projects.id, project.id))
        .returning();

      return reply.send(toPublicProject(updated));
    },
  );

  app.delete(
    "/api/projects/:id",
    { schema: { params: projectIdParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, request.params.id),
      });
      if (!project || project.ownerId !== request.user.sub) {
        return reply.status(404).send({ error: "Project not found" });
      }

      await db.delete(projectMembers).where(eq(projectMembers.projectId, project.id));
      await db.delete(projects).where(eq(projects.id, project.id));
      return reply.send({ ok: true });
    },
  );

  app.get(
    "/api/projects/:id/members",
    { schema: { params: projectIdParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, request.params.id),
      });
      if (!project) {
        return reply.status(404).send({ error: "Project not found" });
      }
      const membership = await requireWorkspaceMembership(project.workspaceId, request.user.sub);
      if (!membership) {
        return reply.status(404).send({ error: "Project not found" });
      }

      const rows = await db
        .select({ member: projectMembers, user: users })
        .from(projectMembers)
        .innerJoin(users, eq(projectMembers.userId, users.id))
        .where(eq(projectMembers.projectId, project.id));

      const members: ProjectMember[] = rows.map((row) => ({
        userId: row.user.id,
        projectId: row.member.projectId,
        role: row.member.role,
        name: row.user.name,
        email: row.user.email,
        photoUrl: row.user.photoUrl,
        createdAt: row.member.createdAt.toISOString(),
      }));

      return reply.send(members);
    },
  );

  app.post(
    "/api/projects/:id/members",
    {
      schema: { params: projectIdParamsSchema, body: addProjectMemberSchema },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, request.params.id),
      });
      if (!project) {
        return reply.status(404).send({ error: "Project not found" });
      }
      const membership = await requireWorkspaceMembership(project.workspaceId, request.user.sub);
      if (!membership) {
        return reply.status(404).send({ error: "Project not found" });
      }
      const targetMembership = await requireWorkspaceMembership(
        project.workspaceId,
        request.body.userId,
      );
      if (!targetMembership) {
        return reply.status(400).send({ error: "That person isn't in this workspace" });
      }

      const existing = await db.query.projectMembers.findFirst({
        where: and(
          eq(projectMembers.projectId, project.id),
          eq(projectMembers.userId, request.body.userId),
        ),
      });
      if (existing) {
        return reply.status(409).send({ error: "Already a project member" });
      }

      await db.insert(projectMembers).values({
        projectId: project.id,
        userId: request.body.userId,
        role: request.body.role,
      });

      return reply.status(201).send({ ok: true });
    },
  );

  app.delete(
    "/api/projects/:id/members/:userId",
    { schema: { params: projectMemberParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, request.params.id),
      });
      if (!project) {
        return reply.status(404).send({ error: "Project not found" });
      }
      const membership = await requireWorkspaceMembership(project.workspaceId, request.user.sub);
      if (!membership) {
        return reply.status(404).send({ error: "Project not found" });
      }
      if (project.ownerId === request.params.userId) {
        return reply.status(400).send({ error: "Can't remove the project owner" });
      }

      await db
        .delete(projectMembers)
        .where(
          and(
            eq(projectMembers.projectId, project.id),
            eq(projectMembers.userId, request.params.userId),
          ),
        );

      return reply.send({ ok: true });
    },
  );
};
