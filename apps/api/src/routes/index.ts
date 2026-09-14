import { authRoutes } from "./auth";
import { healthRoutes } from "./health";
import { usersRoutes } from "./users";
import { workspacesRoutes } from "./workspaces";
import { invitesRoutes } from "./invites";
import { projectsRoutes } from "./projects";
import { sectionsRoutes } from "./sections";
import { tasksRoutes } from "./tasks";
import { commentsRoutes } from "./comments";
import { followersRoutes } from "./followers";
import { activityRoutes } from "./activity";
import { attachmentsRoutes } from "./attachments";
import { messagesRoutes } from "./messages";
import { subtasksRoutes } from "./subtasks";
import { dependenciesRoutes } from "./dependencies";
import { customFieldsRoutes } from "./customFields";
import { searchRoutes } from "./search";
import { meRoutes } from "./me";
import { notificationsRoutes } from "./notifications";
import { FastifyInstance } from "fastify";

export async function apiRouter(app:FastifyInstance){
  app.register(authRoutes);
  app.register(healthRoutes);
  app.register(usersRoutes);
  app.register(workspacesRoutes);
  app.register(invitesRoutes);
  app.register(projectsRoutes);
  app.register(sectionsRoutes);
  app.register(tasksRoutes);
  app.register(commentsRoutes);
  app.register(followersRoutes);
  app.register(activityRoutes);
  app.register(attachmentsRoutes);
  app.register(messagesRoutes);
  app.register(subtasksRoutes);
  app.register(dependenciesRoutes);
  app.register(customFieldsRoutes);
  app.register(searchRoutes);
  app.register(meRoutes);
  app.register(notificationsRoutes);
}
  