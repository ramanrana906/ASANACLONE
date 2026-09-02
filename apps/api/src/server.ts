import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookies from "@fastify/cookie";
import jwt from "@fastify/jwt";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { authRoutes } from "./routes/auth";
import { boardsRoutes } from "./routes/boards";
import { healthRoutes } from "./routes/health";

const app = Fastify({
  logger: true,
}).withTypeProvider<ZodTypeProvider>();

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

await app.register(cookies);

await app.register(jwt, {
  secret: process.env.JWT_SECRET!,
  cookie: {
    cookieName: "session",
    signed: false,
  },
});

app.decorate("authenticate", async (request, reply) => {
  try {
    await request.jwtVerify({ onlyCookie: true });
  } catch {
    return reply.status(401).send({ error: "Unauthorized" });
  }
});

await app.register(cors, {
  origin: process.env.CORS_ORIGIN,
  credentials: true,
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
