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
APP_URL=http://localhost:5173
JWT_SECRET=<generate with `openssl rand -hex 32`>
COOKIE_SECRET=<generate with `openssl rand -hex 32`>
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=30
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=
SMTP_PASS=
RESEND_API_KEY=
MAIL_FROM=Clearing <onboarding@resend.dev>
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:4002/api/auth/google/callback
```

Required for signup/login to work at all:
- `JWT_SECRET` signs the access-token JWT.
- `COOKIE_SECRET` signs the session and refresh-token cookies.

Optional — the app runs fine locally without these, with reduced functionality:
- Mail sending tries SMTP first, then [Resend](https://resend.com), then falls back to
  logging the email (including the link) to the API console — leave all of it blank in dev
  if that's fine.
  - `SMTP_USER` / `SMTP_PASS` — e.g. Gmail: `SMTP_USER` is your Gmail address, `SMTP_PASS` is
    an **App Password** (not your normal password) generated at
    [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) — requires
    2-Step Verification enabled on the account first. Delivers to any recipient.
  - `RESEND_API_KEY` — a [Resend](https://resend.com/api-keys) API key. Without a verified
    domain, Resend's free tier only delivers to the email address your Resend account itself
    uses — fine for testing the flow yourself, not for real recipients.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — leave blank to disable "Sign in with
  Google" (the button still renders, but the flow fails at Google). To enable it, create an
  OAuth client in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
  (type: Web application) with an authorized redirect URI matching
  `GOOGLE_CALLBACK_URL` above, and paste the generated client ID/secret in.

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

### 6. Create a workspace

After signing up and logging in, the app gates behind having at least one **workspace** — the
root of the domain hierarchy (`Workspace > Project > Section > Task > Subtask`, see
[docs/sprint-backlog.md](docs/sprint-backlog.md)). You'll be prompted to create one on first
login; more can be created later from the workspace switcher in the sidebar. Settings
(profile, account, emails, sessions) are reachable from the "Settings" link in the sidebar.

Workspace membership is invite-based: from the "People" link in the sidebar, an admin can
invite people by email (they get a link to `/accept-invite?token=...`) and manage roles
(admin/member/guest). A workspace's creator is its owner and can't be demoted or removed.
Inviting someone can also add them straight to specific projects.

### 7. Create a project

Inside a workspace, the main view is its **Projects** list — click "New project" to create
one, then click into it. Each project has an Overview tab (status, description, and its own
roles list — owner/editor/commenter) plus a tab bar for List/Board/Timeline/Dashboard/
Calendar, which render as placeholders until their sprints land.

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
