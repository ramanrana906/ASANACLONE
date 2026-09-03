import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { workspaceMembers } from "../db/schema";

export function getMembership(workspaceId: number, userId: number) {
  return db.query.workspaceMembers.findFirst({
    where: and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)),
  });
}
