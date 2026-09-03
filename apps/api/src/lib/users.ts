import type { User } from "@asanaClone/shared";
import type { users } from "../db/schema";

export function toPublicUser(row: typeof users.$inferSelect): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    emailVerified: row.emailVerified,
    photoUrl: row.photoUrl,
    pronouns: row.pronouns,
    jobTitle: row.jobTitle,
    department: row.department,
    aboutMe: row.aboutMe,
    outOfOfficeMessage: row.outOfOfficeMessage,
    outOfOfficeUntil: row.outOfOfficeUntil ? row.outOfOfficeUntil.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}
