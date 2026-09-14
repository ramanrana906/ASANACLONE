import { pgTable, serial, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { userRoleEnum, authProviderEnum } from "./enums";

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
