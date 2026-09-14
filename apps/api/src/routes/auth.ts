import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "@asanaClone/shared";
import { db } from "../db";
import { users } from "../db/schema";
import { generateToken, hashToken } from "../infrastructure/tokens";
import { sendPasswordResetEmail, sendVerificationEmail } from "../infrastructure/mailer";
import { toPublicUser } from "../services/users";
import {
  issueSession,
  clearSessionCookies,
  readRefreshToken,
  revokeSessionByRefreshToken,
} from "../infrastructure/session";

const APP_URL = process.env.APP_URL || "http://localhost:5173";
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const AUTH_RATE_LIMIT = { max: 5, timeWindow: "1 minute" };

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/api/auth/signup",
    { schema: { body: signupSchema }, config: { rateLimit: AUTH_RATE_LIMIT } },
    async (request, reply) => {
      const { email, password, name } = request.body;

      const existing = await db.query.users.findFirst({
        where: eq(users.email, email),
      });
      if (existing) {
        return reply.status(409).send({ error: "Email already in use" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const emailVerificationToken = generateToken();
      const [user] = await db
        .insert(users)
        .values({
          email,
          name,
          passwordHash,
          emailVerificationToken: hashToken(emailVerificationToken),
        })
        .returning();

      await sendVerificationEmail(
        user.email,
        `${APP_URL}/verify-email?token=${emailVerificationToken}`,
      );
      await issueSession(app, reply, user.id, request.headers["user-agent"]);

      return reply.status(201).send(toPublicUser(user));
    },
  );

  app.post(
    "/api/auth/login",
    { schema: { body: loginSchema }, config: { rateLimit: AUTH_RATE_LIMIT } },
    async (request, reply) => {
      const { email, password } = request.body;

      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });
      if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
        return reply.status(401).send({ error: "Invalid email or password" });
      }
      if (user.deactivatedAt) {
        return reply.status(403).send({ error: "This account has been deactivated" });
      }

      await issueSession(app, reply, user.id, request.headers["user-agent"]);

      return reply.send(toPublicUser(user));
    },
  );

  app.post("/api/auth/logout", async (request, reply) => {
    const refreshToken = readRefreshToken(request);
    if (refreshToken) {
      await revokeSessionByRefreshToken(refreshToken);
    }
    clearSessionCookies(reply);
    return reply.send({ ok: true });
  });

  app.post("/api/auth/refresh", async (request, reply) => {
    const refreshToken = readRefreshToken(request);
    if (!refreshToken) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const session = await db.query.sessions.findFirst({
      where: (sessions, { eq }) => eq(sessions.refreshTokenHash, hashToken(refreshToken)),
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    await revokeSessionByRefreshToken(refreshToken);
    await issueSession(app, reply, session.userId, request.headers["user-agent"]);

    return reply.send({ ok: true });
  });

  app.get(
    "/api/auth/me",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, request.user.sub),
      });
      if (!user) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      return reply.send(toPublicUser(user));
    },
  );

  app.post(
    "/api/auth/forgot-password",
    { schema: { body: forgotPasswordSchema }, config: { rateLimit: AUTH_RATE_LIMIT } },
    async (request, reply) => {
      const { email } = request.body;

      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });
      if (user && user.provider === "local") {
        const token = generateToken();
        await db
          .update(users)
          .set({
            passwordResetToken: hashToken(token),
            passwordResetExpiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
          })
          .where(eq(users.id, user.id));

        await sendPasswordResetEmail(user.email, `${APP_URL}/reset-password?token=${token}`);
      }

      // Always respond 200 so this endpoint can't be used to enumerate emails.
      return reply.send({ ok: true });
    },
  );

  app.post(
    "/api/auth/reset-password",
    { schema: { body: resetPasswordSchema } },
    async (request, reply) => {
      const { token, password } = request.body;

      const user = await db.query.users.findFirst({
        where: eq(users.passwordResetToken, hashToken(token)),
      });
      if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
        return reply.status(400).send({ error: "Invalid or expired reset link" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      await db
        .update(users)
        .set({ passwordHash, passwordResetToken: null, passwordResetExpiresAt: null })
        .where(eq(users.id, user.id));

      return reply.send({ ok: true });
    },
  );

  app.post(
    "/api/auth/verify-email",
    { schema: { body: verifyEmailSchema } },
    async (request, reply) => {
      const { token } = request.body;

      const user = await db.query.users.findFirst({
        where: eq(users.emailVerificationToken, hashToken(token)),
      });
      if (!user) {
        return reply.status(400).send({ error: "Invalid or expired verification link" });
      }

      await db
        .update(users)
        .set({ emailVerified: true, emailVerificationToken: null })
        .where(eq(users.id, user.id));

      return reply.send({ ok: true });
    },
  );

  app.post(
    "/api/auth/resend-verification",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, request.user.sub),
      });
      if (!user) {
        return reply.status(401).send({ error: "Unauthorized" });
      }
      if (user.emailVerified) {
        return reply.send({ ok: true });
      }

      const token = generateToken();
      await db
        .update(users)
        .set({ emailVerificationToken: hashToken(token) })
        .where(eq(users.id, user.id));

      await sendVerificationEmail(user.email, `${APP_URL}/verify-email?token=${token}`);

      return reply.send({ ok: true });
    },
  );

  app.get("/api/auth/google/callback", async (request, reply) => {
    const { token } = await app.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!profileRes.ok) {
      return reply.redirect(`${APP_URL}/?auth_error=google`);
    }
    const profile = (await profileRes.json()) as {
      id: string;
      email: string;
      name: string;
    };

    let user = await db.query.users.findFirst({
      where: eq(users.googleId, profile.id),
    });

    if (!user) {
      const existing = await db.query.users.findFirst({
        where: eq(users.email, profile.email),
      });

      if (existing) {
        [user] = await db
          .update(users)
          .set({ googleId: profile.id, provider: "google", emailVerified: true })
          .where(eq(users.id, existing.id))
          .returning();
      } else {
        [user] = await db
          .insert(users)
          .values({
            email: profile.email,
            name: profile.name,
            googleId: profile.id,
            provider: "google",
            emailVerified: true,
          })
          .returning();
      }
    }

    await issueSession(app, reply, user.id, request.headers["user-agent"]);
    return reply.redirect(`${APP_URL}/`);
  });
};
