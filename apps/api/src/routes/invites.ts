import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  acceptInviteSchema,
  inviteSchema,
  type AcceptedInvite,
  type PendingInvite,
} from "@asanaClone/shared";
import { db } from "../db";
import { invites, projectMembers, projects, users, workspaceMembers, workspaces } from "../db/schema";
import { generateToken } from "../infrastructure/tokens";
import { sendWorkspaceInviteEmail } from "../infrastructure/mailer";
import { getMembership } from "../policies/workspaceAccess";

const workspaceIdParamsSchema = z.object({ id: z.coerce.number() });
const inviteTokenParamsSchema = z.object({ token: z.string().min(1) });

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const APP_URL = process.env.APP_URL || "http://localhost:5173";

function toPendingInvite(row: typeof invites.$inferSelect): PendingInvite {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
  };
}

export const invitesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/api/workspaces/:id/invites",
    {
      schema: { params: workspaceIdParamsSchema, body: inviteSchema },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const membership = await getMembership(request.params.id, request.user.sub);
      if (!membership) {
        return reply.status(404).send({ error: "Workspace not found" });
      }
      if (membership.role !== "admin") {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const [workspace, inviter] = await Promise.all([
        db.query.workspaces.findFirst({ where: eq(workspaces.id, request.params.id) }),
        db.query.users.findFirst({ where: eq(users.id, request.user.sub) }),
      ]);
      if (!workspace || !inviter) {
        return reply.status(404).send({ error: "Workspace not found" });
      }

      // Only project IDs that actually belong to this workspace can be attached.
      let projectIds: number[] | undefined;
      if (request.body.projectIds && request.body.projectIds.length > 0) {
        const workspaceProjects = await db.query.projects.findMany({
          where: eq(projects.workspaceId, workspace.id),
        });
        const validIds = new Set(workspaceProjects.map((p) => p.id));
        projectIds = request.body.projectIds.filter((id) => validIds.has(id));
      }

      const created: PendingInvite[] = [];

      for (const email of request.body.emails) {
        const existingUser = await db.query.users.findFirst({ where: eq(users.email, email) });
        if (existingUser) {
          const alreadyMember = await getMembership(workspace.id, existingUser.id);
          if (alreadyMember) continue;
        }

        const existingInvite = await db.query.invites.findFirst({
          where: and(
            eq(invites.workspaceId, workspace.id),
            eq(invites.email, email),
            eq(invites.status, "pending"),
          ),
        });

        const token = generateToken();
        const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

        let invite: typeof invites.$inferSelect;
        if (existingInvite) {
          [invite] = await db
            .update(invites)
            .set({ token, expiresAt, role: request.body.role, projectIds })
            .where(eq(invites.id, existingInvite.id))
            .returning();
        } else {
          [invite] = await db
            .insert(invites)
            .values({
              workspaceId: workspace.id,
              email,
              invitedBy: request.user.sub,
              role: request.body.role,
              token,
              expiresAt,
              projectIds,
            })
            .returning();
        }

        await sendWorkspaceInviteEmail(
          email,
          inviter.name,
          workspace.name,
          `${APP_URL}/accept-invite?token=${token}`,
        );
        created.push(toPendingInvite(invite));
      }

      return reply.status(201).send(created);
    },
  );

  app.get(
    "/api/workspaces/:id/invites",
    { schema: { params: workspaceIdParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const membership = await getMembership(request.params.id, request.user.sub);
      if (!membership) {
        return reply.status(404).send({ error: "Workspace not found" });
      }

      const rows = await db.query.invites.findMany({
        where: and(eq(invites.workspaceId, request.params.id), eq(invites.status, "pending")),
      });

      return reply.send(rows.map(toPendingInvite));
    },
  );

  app.post(
    "/api/invites/:token/accept",
    { schema: { params: inviteTokenParamsSchema }, preHandler: [app.authenticate] },
    async (request, reply) => {
      const invite = await db.query.invites.findFirst({
        where: eq(invites.token, request.params.token),
      });
      if (!invite || invite.status !== "pending" || invite.expiresAt < new Date()) {
        return reply.status(400).send({ error: "Invalid or expired invite" });
      }

      const user = await db.query.users.findFirst({ where: eq(users.id, request.user.sub) });
      if (!user || user.email.toLowerCase() !== invite.email.toLowerCase()) {
        return reply
          .status(403)
          .send({ error: `This invite was sent to ${invite.email} — log in with that email` });
      }

      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, invite.workspaceId),
      });
      if (!workspace) {
        return reply.status(404).send({ error: "Workspace not found" });
      }

      const existingMembership = await getMembership(invite.workspaceId, user.id);
      if (!existingMembership) {
        await db
          .insert(workspaceMembers)
          .values({ workspaceId: invite.workspaceId, userId: user.id, role: invite.role });
      }

      if (invite.projectIds && invite.projectIds.length > 0) {
        for (const projectId of invite.projectIds) {
          const alreadyOnProject = await db.query.projectMembers.findFirst({
            where: and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, user.id)),
          });
          if (!alreadyOnProject) {
            await db.insert(projectMembers).values({ projectId, userId: user.id, role: "editor" });
          }
        }
      }

      await db.update(invites).set({ status: "accepted" }).where(eq(invites.id, invite.id));

      const result: AcceptedInvite = { workspaceId: workspace.id, workspaceName: workspace.name };
      return reply.send(result);
    },
  );
};
