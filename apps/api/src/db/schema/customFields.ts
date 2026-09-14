import { pgTable, serial, text, timestamp, integer, unique, jsonb } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { tasks } from "./tasks";
import { customFieldTypeEnum } from "./enums";

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
