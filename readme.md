# Asana Clone

A monorepo project management app.

## Architecture

```
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
```

For a general reference on how a product like Asana is architected at scale (services, data model, background processing, integrations), see [docs/asana-architecture-reference.md](docs/asana-architecture-reference.md). Note that this describes the real Asana product conceptually — it is not a description of this repo.

This project is built feature-by-feature, in sprints. See [docs/sprint-backlog.md](docs/sprint-backlog.md) for the domain hierarchy and the ordered sprint plan.

## Project Structure

- `apps/web` – React + Vite frontend
- `apps/api` – Fastify + TypeScript backend
- `packages/shared` – shared TypeScript types/schemas (Zod) used by both apps

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- [Docker](https://www.docker.com/) (to run PostgreSQL locally)

## Getting Started

### 1. Clone the repo and install dependencies

```bash
git clone <repo-url>
cd ASANACLONE
pnpm install
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

This starts Postgres on `localhost:5432` with the credentials defined in [docker-compose.yml](docker-compose.yml):

- user: `user`
- password: `password`
- database: `asanaClone`

### 3. Configure environment variables

Copy `apps/api/.env.example` to `apps/api/.env`:

```
DATABASE_URL=postgresql://user:password@localhost:5432/asanaClone
PORT=4002
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=<generate with `openssl rand -hex 32`>
```

`JWT_SECRET` signs the auth session cookie — required for signup/login to work.

Copy `apps/web/.env.example` to `apps/web/.env`, and point it at the API port above:

```
VITE_API_URL=http://localhost:4002
```

### 4. Run database migrations

```bash
pnpm --filter api db:migrate
```

### 5. Start the dev servers

```bash
pnpm dev
```

This runs the API and web app concurrently:

- API: [http://localhost:4002](http://localhost:4002) (health check at `/api/health`)
- Web: [http://localhost:5173](http://localhost:5173)

## Useful Scripts

Run from the repo root:

- `pnpm dev` – run `api` + `web` in dev mode
- `pnpm build` – build all apps
- `pnpm lint` – lint all apps
- `pnpm format` – format the codebase with Prettier
- `pnpm clean` – remove build output

Scoped to the API (`pnpm --filter api <script>`):

- `db:generate` – generate a Drizzle migration from schema changes
- `db:migrate` – apply migrations to the database
- `db:studio` – open Drizzle Studio
