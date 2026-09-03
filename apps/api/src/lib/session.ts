import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { sessions } from "../db/schema";
import { generateToken, hashToken } from "./tokens";

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "15m";
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 30;
const isProduction = process.env.NODE_ENV === "production";

const REFRESH_COOKIE = "refresh_token";
const SESSION_COOKIE = "session";

export async function issueSession(
  app: FastifyInstance,
  reply: FastifyReply,
  userId: number,
  userAgent: string | undefined,
): Promise<void> {
  const accessToken = app.jwt.sign({ sub: userId }, { expiresIn: ACCESS_TOKEN_TTL });
  reply.setCookie(SESSION_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    signed: true,
    path: "/",
  });

  const refreshToken = generateToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({
    userId,
    refreshTokenHash: hashToken(refreshToken),
    userAgent: userAgent ?? null,
    expiresAt,
  });

  reply.setCookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    signed: true,
    path: "/api/auth",
  });
}

export function clearSessionCookies(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, { path: "/" });
  reply.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
}

export function readRefreshToken(request: FastifyRequest): string | null {
  const raw = request.cookies[REFRESH_COOKIE];
  if (!raw) return null;
  const unsigned = request.unsignCookie(raw);
  return unsigned.valid ? unsigned.value : null;
}

export async function revokeSessionByRefreshToken(refreshToken: string): Promise<void> {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.refreshTokenHash, hashToken(refreshToken)));
}
