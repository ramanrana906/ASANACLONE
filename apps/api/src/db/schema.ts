import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  unique,
  jsonb,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "member", "guest"]);
export const authProviderEnum = pgEnum("auth_provider", ["local", "google"]);
export const inviteStatusEnum = pgEnum("invite_status", [
  "pending",
  "accepted",
  "expired",
  "revoked",
]);
export const projectStatusEnum = pgEnum("project_status", ["on_track", "at_risk", "off_track"]);
export const projectRoleEnum = pgEnum("project_role", ["owner", "editor", "commenter"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  role: userRoleEnum("role").notNull().default("member"),
  provider: authProviderEnum("provider").notNull().default("local"),
  googleId: text("google_id").unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationToken: text("email_verification_token"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpiresAt: timestamp("password_reset_expires_at"),
  photoUrl: text("photo_url"),
  pronouns: text("pronouns"),
  jobTitle: text("job_title"),
  department: text("department"),
  aboutMe: text("about_me"),
  outOfOfficeMessage: text("out_of_office_message"),
  outOfOfficeUntil: timestamp("out_of_office_until"),
  deactivatedAt: timestamp("deactivated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userEmails = pgTable("user_emails", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  email: text("email").notNull().unique(),
  isPreferred: boolean("is_preferred").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  refreshTokenHash: text("refresh_token_hash").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
});

export const boards = pgTable("boards", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
