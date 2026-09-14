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
Calendar/Messages. Board renders a project's **sections** as kanban columns (add, rename,
delete, drag-to-reorder); List and Calendar are two more live views over the same
sections/tasks (see below); Timeline and Dashboard stay placeholders until their sprints land.
Sections replace the old standalone `boards` table from earlier sprints — a board is now a
view over a project's sections, not its own entity, matching the Workspace → Project →
Section → Task hierarchy.

Sections hold **tasks**: click "Add task" on a column, or click a task card to open its detail
panel (mark complete, assignee, due-date range, description). Drag a card within or between
sections to reorder or move it. A task can belong to more than one project at once — the
detail panel's Projects list shows every project/section it's placed in and lets you add
another project from the same workspace or remove one (a task always keeps at least one).

The task detail panel also carries **followers** (an avatar stack, plus a Follow/Following
toggle for yourself — you're auto-followed when you create a task or get assigned to one),
**attachments** (upload a file, download it, or delete it), and a merged **comments +
activity feed** at the bottom (oldest/newest sort) — every assignee, due-date, completion, and
section change is logged there automatically alongside comments you post. Each project also
has a **Messages** tab: a simple composer and chronological feed for project-level
discussion, separate from any one task.

Attachment files are stored on local disk under `apps/api/uploads/` in dev (gitignored) and
served back through an authenticated download route — swap this for S3-compatible object
storage before running in production; nothing else in the attachment flow needs to change,
just where `saveUploadedFile`/`deleteAttachmentFile` (`apps/api/src/lib/attachmentStorage.ts`)
actually write and read bytes.

A task can carry more depth than the board card shows. **Subtasks** are a lightweight
checklist on the task panel (they don't get their own board placement). **Dependencies** mark
one task as blocked by another — each side of the relationship shows up on both tasks
("Blocked by" / "Blocking"), and the picker searches within the task's own project.
**Custom fields** are defined per project (Overview tab → Custom fields: text, number,
single-select, or multi-select with colored options) and every task in that project can set
its own value per field, shown as colored pills on the task panel. Marking a task a
**milestone** puts a diamond marker on its card and lists it in the project Overview's
Milestones section.

A project's tasks can also be worked from two other views, alongside Board. The **List** tab
is a sortable table — click a column header (Name/Assignee/Due date) to sort, grouped into
collapsible sections, with one extra column per custom field the project defines. The
**Calendar** tab is a month grid: each task appears as a chip on every day within its due-date
range, click a day's "+" to quick-add a task due that day, and click a chip to open its detail
panel. Both views read the same project task list Board uses — there's no separate
List/Calendar-specific endpoint, so any change made in one view is reflected in the others
immediately.

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
