# Sprint Backlog

This project is built feature-by-feature, in sprints. Each sprint is a complete vertical
slice — schema, API, and UI — that works end-to-end before the next sprint starts.

## Domain hierarchy

The core entity hierarchy, modeled after Asana:

```
Workspace
  └── Project
        └── Board
              └── Section (column)
                    └── Task
                          └── Subtask
```

A Board always belongs to a Project, and a Project always belongs to a Workspace.

## Sprint order

1. **Auth & Users** – sign up/login/logout with email + password (bcrypt-hashed), JWT session
   in an httpOnly cookie, a `users` table with a global `role` (admin/member/guest). This
   comes first so every later entity (workspaces, tasks, invites) can be owned by a real user
   from the start.
2. **Workspaces** – schema, CRUD API, and UI to create/list/switch workspaces. Owned by the
   authenticated user. Root of the domain hierarchy.
3. **Roles & invites** – invite members into a workspace; workspace-scoped roles
   (admin/member/guest) and permission checks on workspace actions.
4. **Projects** – nested under a workspace (`workspace_id` FK). CRUD API + UI to view
   projects inside a workspace, create/delete a project.
5. **Boards (refactor + finish)** – migrate the existing flat `boards` table to add
   `project_id`. Finish CRUD (GET/PATCH/DELETE were missing) + UI to view boards inside a
   project.
6. **Sections/columns** – kanban columns within a board (e.g. To Do / In Progress / Done).
   Needed before tasks so cards have somewhere to live.
7. **Tasks (core)** – task CRUD: title, description, due date, status. Rendered as cards in
   board columns; basic drag-between-columns.
8. **Task collaboration** – assignees (real users), comments/activity feed, followers,
   file attachments.
9. **Task depth** – subtasks, dependencies (blocking/waiting on), tags, custom fields.
10. **More views** – List view and Calendar view for a project (Board view already exists
    from Sprint 6).
11. **Search & personal views** – global search, filters/sorting, "My Tasks" view,
    notifications/inbox.
12. **Automation** – rules (trigger → action), project templates, intake forms.
13. **Reporting** – portfolios, goals, dashboards/charts, workload view.

## Sprint 1 tasks: Auth & Users

Schema
- [ ] Add a `users` table: `id`, `email` (unique), `passwordHash`, `name`, `role` enum
      (`admin`/`member`/`guest`, default `member`), `createdAt`.
- [ ] Generate and run the DB migration for the new table.

Shared package
- [ ] Add Zod schemas: `userSchema`, `signupSchema`, `loginSchema`, `userRoleSchema`.

API
- [ ] Add dependencies for password hashing and JWT/cookie-based sessions.
- [ ] `POST /api/auth/signup` – create a user, hash the password, set the session cookie.
- [ ] `POST /api/auth/login` – verify credentials, set the session cookie.
- [ ] `POST /api/auth/logout` – clear the session cookie.
- [ ] `GET /api/auth/me` – return the current authenticated user, or 401.
- [ ] Add `JWT_SECRET` to env config and document it.

Frontend
- [ ] Add auth API client functions (signup/login/logout/me), sending credentials/cookies.
- [ ] Add a `useAuth` hook/context wired to React Query.
- [ ] Build a signup form and a login form.
- [ ] Show logged-in state (name, role) with a logout button.
- [ ] Gate the rest of the app behind authentication.

Docs
- [ ] Update the README with the new env var and any auth setup steps.

## Out of scope

Features that exist in real Asana but aren't planned for this clone:

- Native mobile apps
- Third-party integrations (Slack, Google Drive, etc.)
- Enterprise admin console / SSO
