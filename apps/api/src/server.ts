import Fastify from "fastify";

const app = Fastify({
  logger: true,
});

app.get("/api/health", async () => {
  return {
    message: "API is working",
  };
});

app.listen({ port: 4000 }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }

  console.log(`Server running at ${address}`);
});