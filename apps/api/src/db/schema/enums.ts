import { pgEnum } from "drizzle-orm/pg-core";

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
