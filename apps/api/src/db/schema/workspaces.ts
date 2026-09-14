import { pgTable, serial, text, timestamp, integer, unique, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users";
import { userRoleEnum, inviteStatusEnum } from "./enums";

export const workspaces = pgTable("workspaces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    role: userRoleEnum("role").notNull().default("member"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.workspaceId, table.userId)],
);

export const invites = pgTable("invites", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  email: text("email").notNull(),
  invitedBy: integer("invited_by")
    .notNull()
    .references(() => users.id),
  role: userRoleEnum("role").notNull().default("member"),
  token: text("token").notNull().unique(),
  status: inviteStatusEnum("status").notNull().default("pending"),
  projectIds: jsonb("project_ids").$type<number[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});
