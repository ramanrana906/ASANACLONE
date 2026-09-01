
MonoRepo architecture

                         Your Monorepo
                              │
              ┌───────────────┴───────────────┐
              │                               │
           Frontend                         Backend
              │                               │
     React + Vite + TS                Fastify + TS
              │                               │
              └───────────────┬───────────────┘
                              │
                     Shared TypeScript
                         types / schemas
                              │
                              ▼
                         PostgreSQL
                              ▲
                              │
                        Drizzle ORM
                              │
                            Zod


                            Repo / tooling basics


