
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


 TODO:                            

git init — this isn't a git repo yet.
Root .gitignore (covers node_modules, dist, .env*, .DS_Store) — only apps/web has one; apps/api has none.
Root package.json — currently missing entirely, which is why plain pnpm dev fails at the root. Add one with a dev script that runs both apps concurrently (e.g. via concurrently or Turborepo), plus shared devDependencies (TypeScript, ESLint/Prettier config, etc.) if you want them workspace-wide.
Root ESLint/Prettier config shared across apps/*, if you want consistent lint rules (right now only apps/web has an eslint config).
Backend (apps/api)
5. Environment variables — no .env handling at all. Add dotenv (or Fastify's env plugin), a .env.example, and load config for PORT, DB connection string, etc.
6. CORS — @fastify/cors isn't installed; the frontend (port 5173) can't currently call the backend (port 4000) from a browser without it.
7. PostgreSQL — no database exists yet. Set up a local Postgres instance (or a docker-compose.yml for one) and a connection string.
8. Drizzle ORM — not installed/configured. Need drizzle-orm, drizzle-kit, a drizzle.config.ts, a schema.ts, and a migrations folder.
9. Zod — not installed in apps/api despite being in the architecture diagram; needed for request/response validation.
10. Real routes — only /api/health exists; no actual Trello-clone domain logic (boards/lists/cards/auth) yet.

Frontend (apps/web)
11. Still the default Vite template (App.tsx has the counter demo, unused hero/react/vite assets) — needs to be replaced with actual app UI.
12. API client setup — nothing calls the backend yet; you'll want a base URL (likely from a VITE_API_URL env var) and a fetch/axios/query client (e.g. TanStack Query).
13. .env for the frontend (e.g. VITE_API_URL=http://localhost:4000).

Shared code
14. packages/ directory doesn't exist yet, even though pnpm-workspace.yaml already reserves it and the readme's architecture calls for "shared TypeScript types/schemas." Create a packages/shared (or similar) workspace package for types/Zod schemas used by both apps/api and apps/web.

