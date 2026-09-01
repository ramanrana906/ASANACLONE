# Asana Architecture Reference

This is a conceptual reference for how a product like Asana is typically architected at scale.
It describes the general shape of the *real* Asana product (or a system like it) — it is **not**
a description of this repo's implementation. For this project's actual architecture, see the
[Architecture section in the main README](../readme.md#architecture).

## High-level system architecture

```text
                         ┌──────────────────────┐
                         │      Users           │
                         │ Web / Mobile / API   │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   Load Balancer /    │
                         │      CDN / Edge      │
                         └──────────┬───────────┘
                                    │
                                    ▼
                 ┌──────────────────────────────────┐
                 │          Asana Application        │
                 │                                  │
                 │  ┌──────────┐   ┌─────────────┐ │
                 │  │ Auth &   │   │ API /       │ │
                 │  │ Identity  │   │ Application │ │
                 │  │           │   │ Services    │ │
                 │  └──────────┘   └──────┬──────┘ │
                 │                        │         │
                 │  ┌─────────────────────┼───────┐ │
                 │  │                     │       │ │
                 │  ▼                     ▼       ▼ │
                 │ Tasks / Projects     Teams   Users│
                 │ Comments             Files   Rules│
                 │ Dependencies         Goals   Search│
                 └─────────────────────┬────────────┘
                                       │
                 ┌─────────────────────┼─────────────────────┐
                 │                     │                     │
                 ▼                     ▼                     ▼
        ┌────────────────┐   ┌────────────────┐   ┌────────────────┐
        │ Primary        │   │ Cache          │   │ Search /       │
        │ Database       │   │ Redis-like     │   │ Index          │
        │                │   │ Layer          │   │                │
        └────────────────┘   └────────────────┘   └────────────────┘
                 │
                 ▼
        ┌────────────────────────────────────┐
        │       Background Processing        │
        │                                    │
        │ Notifications │ Rules │ Workflows  │
        │ Emails        │ Jobs  │ Integrations│
        └────────────────┬───────────────────┘
                         │
                         ▼
              ┌───────────────────────┐
              │ External Integrations │
              │                       │
              │ Slack │ Google │ MS   │
              │ GitHub│ Salesforce │ etc│
              └───────────────────────┘
```

### Core architectural concepts

| Layer                            | Responsibility                                                         |
| --------------------------------- | ------------------------------------------------------------------------ |
| **Web/Mobile clients**           | User interface for tasks, projects, teams, dashboards                  |
| **API layer**                    | Handles requests from clients and integrations                         |
| **Application services**         | Business logic for tasks, projects, users, permissions, workflows      |
| **Database**                     | Persistent storage for users, tasks, projects, comments, relationships |
| **Cache**                        | Speeds up frequently accessed data                                     |
| **Search/indexing**              | Fast searching across tasks, projects, users, etc.                     |
| **Background workers**           | Notifications, automation, scheduled jobs, integrations                |
| **File storage**                 | Attachments and uploaded files                                         |
| **Integration layer**            | Connects Asana with external systems                                   |
| **Authentication/authorization** | Login, SSO, roles, workspace/team permissions                          |

## Data model

Asana is built around relationships between objects:

```text
Organization
     │
     ├── Teams
     │     │
     │     └── Projects
     │            │
     │            ├── Sections
     │            │     │
     │            │     └── Tasks
     │            │            │
     │            │            ├── Subtasks
     │            │            ├── Comments
     │            │            ├── Attachments
     │            │            └── Dependencies
     │            │
     │            └── Custom Fields
     │
     └── Users
```

A key architectural idea is that a task can participate in multiple contexts — for example,
being associated with multiple projects, assigned to a user, having dependencies, comments,
attachments, and custom fields all at once.

## Backend services (conceptual)

At scale, a system like Asana isn't one monolithic service — the "Application Services" box
above typically decomposes into independently deployable services:

| Service                     | Responsibility                                                          |
| ---------------------------- | ------------------------------------------------------------------------- |
| **Task/Project service**     | CRUD and business rules for tasks, projects, sections, dependencies     |
| **User/Org service**         | Accounts, workspaces, teams, membership, permissions                    |
| **Notification service**     | Fan-out of in-app, email, and push notifications                        |
| **Rules/Automation service** | Evaluates and executes workflow rules ("when X, do Y")                  |
| **Search service**           | Indexes tasks/projects/comments for full-text and faceted search        |
| **Integration service**      | Manages OAuth tokens and syncs with Slack, GitHub, Google, Salesforce…  |
| **Billing service**          | Subscriptions, seats, plan limits                                       |

Cross-cutting concerns typical of this kind of decomposition:

- **Message queue / event bus** (e.g. Kafka, SQS) — services publish domain events
  (`task.created`, `task.completed`, `comment.added`) that other services subscribe to,
  instead of calling each other synchronously. This is what powers notifications, search
  indexing, and automations without coupling every service to every other one.
- **API gateway** — a single entry point that routes client requests to the right internal
  service, and handles cross-cutting concerns like auth, rate limiting, and request logging.
- **Sharding / partitioning** — large tables (tasks, comments) are typically partitioned by
  organization or workspace ID so no single database instance has to hold every customer's data.
- **Rate limiting & API versioning** — public API clients are throttled per-token, and breaking
  changes ship behind versioned endpoints (`/api/1.0/...`) so integrations don't break silently.

## Real-time sync

Asana's UI updates live when a task changes on another tab, device, or teammate's screen. This
is typically done with:

- **A persistent connection per client** — WebSockets (or long-polling as a fallback) so the
  server can push changes instead of the client polling for them.
- **Pub/sub fan-out** — when a task is mutated, the change is published to a channel scoped to
  the relevant project/workspace; every connected client subscribed to that channel receives
  the delta and patches its local state.
- **Conflict resolution** — concurrent edits (e.g. two users renaming the same task) are
  resolved with a last-write-wins strategy plus versioning/timestamps, or with an
  operational-transform / CRDT approach for finer-grained fields like rich text descriptions.
- **Optimistic UI updates** — the client applies a change locally immediately, then reconciles
  with the server's confirmed state (or rolls back on rejection).

## How this maps to this repo

This project implements a small slice of the conceptual system above. Rough mapping:

| Conceptual layer         | This repo                                                         |
| -------------------------- | --------------------------------------------------------------------- |
| API / Application services | [apps/api](../apps/api) — a single Fastify service (no service decomposition) |
| Web/Mobile clients         | [apps/web](../apps/web) — React + Vite SPA                              |
| Shared types/schemas       | [packages/shared](../packages/shared) — Zod schemas shared by web and api |
| Primary database            | PostgreSQL via Drizzle ORM ([apps/api/src/db](../apps/api/src/db))       |
| Auth & Identity              | Not yet implemented                                                   |
| Cache                        | Not yet implemented                                                   |
| Search / indexing            | Not yet implemented                                                   |
| Background processing        | Not yet implemented                                                   |
| Message queue / event bus    | Not yet implemented                                                   |
| Real-time sync                | Not yet implemented                                                   |
| External integrations        | Not yet implemented                                                   |

Nothing above is a roadmap or commitment — it's just a snapshot of what exists today versus the
conceptual model, useful as a reference if any of these layers get added later.
