import { pgTable, serial, text, timestamp, boolean, integer, jsonb, primaryKey, unique, type AnyPgColumn } from "drizzle-orm/pg-core";
import { users } from "./users";
import { projects, sections } from "./projects";
import { activityTypeEnum } from "./enums";

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
