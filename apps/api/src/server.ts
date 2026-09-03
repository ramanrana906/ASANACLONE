import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookies from "@fastify/cookie";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import oauth2 from "@fastify/oauth2";
import { eq } from "drizzle-orm";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { db } from "./db";
import { users } from "./db/schema";
import { authRoutes } from "./routes/auth";
import { boardsRoutes } from "./routes/boards";
import { healthRoutes } from "./routes/health";

const app = Fastify({
  logger: true,
}).withTypeProvider<ZodTypeProvider>();

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

await app.register(cookies, {
  secret: process.env.COOKIE_SECRET,
});

await app.register(jwt, {
  secret: process.env.JWT_SECRET!,
  cookie: {
    cookieName: "session",
    signed: true,
  },
});

await app.register(rateLimit, {
  global: false,
});

app.decorate("authenticate", async (request, reply) => {
  try {
    await request.jwtVerify({ onlyCookie: true });
  } catch {
    return reply.status(401).send({ error: "Unauthorized" });
  }
});

app.decorate("requireRole", (...roles) => {
  return async (request, reply) => {
    const user = await db.query.users.findFirst({
      where: eq(users.id, request.user.sub),
    });
    if (!user || !roles.includes(user.role)) {
      return reply.status(403).send({ error: "Forbidden" });
    }
  };
});

await app.register(cors, {
  origin: process.env.CORS_ORIGIN,
  credentials: true,
});

await app.register(oauth2, {
  name: "googleOAuth2",
  scope: ["profile", "email"],
  credentials: {
    client: {
      id: process.env.GOOGLE_CLIENT_ID || "",
      secret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
    auth: oauth2.GOOGLE_CONFIGURATION,
  },
  startRedirectPath: "/api/auth/google",
  callbackUri:
    process.env.GOOGLE_CALLBACK_URL || "http://localhost:4002/api/auth/google/callback",
});

await app.register(authRoutes);
await app.register(healthRoutes);
await app.register(boardsRoutes);

const port = Number(process.env.PORT) || 4002;

app.listen({ port }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }

  console.log(`Server running at ${address}`);
});
