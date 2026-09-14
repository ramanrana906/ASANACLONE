import { pgTable, serial, timestamp, boolean, integer, unique } from "drizzle-orm/pg-core";
import { users } from "./users";
import { tasks } from "./tasks";
import { projects } from "./projects";
import { notificationTypeEnum, notificationCategoryEnum } from "./enums";

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
