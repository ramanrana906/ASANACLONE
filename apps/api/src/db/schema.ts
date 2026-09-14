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
  primaryKey,
  type AnyPgColumn,
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
export const activityTypeEnum = pgEnum("activity_type", [
  "due_date_changed",
  "assignee_changed",
  "completed",
  "reopened",
  "section_changed",
]);
export const customFieldTypeEnum = pgEnum("custom_field_type", [
  "single_select",
  "multi_select",
  "text",
  "number",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "assigned",
  "commented",
  "mentioned",
  "due_date_changed",
  "completed",
]);
export const notificationCategoryEnum = pgEnum("notification_category", [
  "project",
  "portfolio",
  "goal",
  "email",
]);

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
  doNotDisturbUntil: timestamp("do_not_disturb_until"),
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

export const sections = pgTable("sections", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  name: text("name").notNull(),
  position: integer("position").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  dueDateStart: timestamp("due_date_start"),
  dueDateEnd: timestamp("due_date_end"),
  assigneeId: integer("assignee_id").references(() => users.id),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id),
  parentTaskId: integer("parent_task_id").references((): AnyPgColumn => tasks.id),
  isMilestone: boolean("is_milestone").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const taskProjects = pgTable(
  "task_projects",
  {
    id: serial("id").primaryKey(),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id),
    sectionId: integer("section_id")
      .notNull()
      .references(() => sections.id),
    position: integer("position").notNull(),
  },
  (table) => [unique().on(table.taskId, table.projectId)],
);

export const taskFollowers = pgTable(
  "task_followers",
  {
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
  },
  (table) => [primaryKey({ columns: [table.taskId, table.userId] })],
);

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id")
    .notNull()
    .references(() => tasks.id),
  authorId: integer("author_id")
    .notNull()
    .references(() => users.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  editedAt: timestamp("edited_at"),
});

export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id")
    .notNull()
    .references(() => tasks.id),
  actorId: integer("actor_id")
    .notNull()
    .references(() => users.id),
  type: activityTypeEnum("type").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const attachments = pgTable("attachments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id")
    .notNull()
    .references(() => tasks.id),
  uploadedBy: integer("uploaded_by")
    .notNull()
    .references(() => users.id),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
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

export const taskDependencies = pgTable(
  "task_dependencies",
  {
    id: serial("id").primaryKey(),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id),
    dependsOnTaskId: integer("depends_on_task_id")
      .notNull()
      .references(() => tasks.id),
  },
  (table) => [unique().on(table.taskId, table.dependsOnTaskId)],
);

export const customFields = pgTable("custom_fields", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  name: text("name").notNull(),
  type: customFieldTypeEnum("type").notNull(),
  options: jsonb("options").$type<{ label: string; color: string }[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const customFieldValues = pgTable(
  "custom_field_values",
  {
    id: serial("id").primaryKey(),
    customFieldId: integer("custom_field_id")
      .notNull()
      .references(() => customFields.id),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id),
    value: jsonb("value").$type<string | string[] | number | null>(),
  },
  (table) => [unique().on(table.customFieldId, table.taskId, table.projectId)],
);

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  type: notificationTypeEnum("type").notNull(),
  actorId: integer("actor_id").references(() => users.id),
  taskId: integer("task_id").references(() => tasks.id),
  projectId: integer("project_id").references(() => projects.id),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    category: notificationCategoryEnum("category").notNull(),
    enabled: boolean("enabled").notNull().default(true),
  },
  (table) => [unique().on(table.userId, table.category)],
);
