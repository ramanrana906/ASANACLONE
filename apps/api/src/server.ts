import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { db } from "./db";
import { boards } from "./db/schema";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { createBoardSchema } from "@asanaClone/shared";

const app = Fastify({
  logger: true,
}).withTypeProvider<ZodTypeProvider>();

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

await app.register(cors, {
  origin: process.env.CORS_ORIGIN,
});

app.get("/api/health", async () => {
  return {
    message: "API is working",
  };
});

app.get("/api/db-health", async () => {
  const rows = await db.select().from(boards);
  return { ok: true, count: rows.length };
});



app.post(
  "/api/boards",
  {
    schema: {
      body: createBoardSchema,
    },
  },
  async (request, reply) => {
    const [board] = await db
      .insert(boards)
      .values({ title: request.body.title })
      .returning();

    return reply.status(201).send(board);
  },
);


const port = Number(process.env.PORT) || 4002;

app.listen({ port }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }

  console.log(`Server running at ${address}`);
});
