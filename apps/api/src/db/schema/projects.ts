import { pgTable, serial, text, timestamp, integer, unique } from "drizzle-orm/pg-core";
import { users } from "./users";
import { workspaces } from "./workspaces";
import { projectStatusEnum, projectRoleEnum } from "./enums";

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  name: text("name").notNull(),
  description: text("description"),
  status: projectStatusEnum("status"),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectMembers = pgTable(
  "project_members",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    role: projectRoleEnum("role").notNull().default("editor"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.projectId, table.userId)],
);

export const sections = pgTable("sections", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  name: text("name").notNull(),
  position: integer("position").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  authorId: integer("author_id")
    .notNull()
    .references(() => users.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  editedAt: timestamp("edited_at"),
});
