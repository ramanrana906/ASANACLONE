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
2. **Auth hardening** – forgot/reset password, Google OAuth login, refresh tokens backed by a
   `sessions` table, rate limiting on auth routes, email verification, role-based route guards,
   and signing the session cookie with the (currently unused) `COOKIE_SECRET`.
3. **Workspaces** – schema, CRUD API, and UI to create/list/switch workspaces. Owned by the
   authenticated user. Root of the domain hierarchy.
4. **Roles & invites** – invite members into a workspace; workspace-scoped roles
   (admin/member/guest) and permission checks on workspace actions.
5. **Projects** – nested under a workspace (`workspace_id` FK). CRUD API + UI to view
   projects inside a workspace, create/delete a project.
6. **Boards (refactor + finish)** – migrate the existing flat `boards` table to add
   `project_id`. Finish CRUD (GET/PATCH/DELETE were missing) + UI to view boards inside a
   project.
7. **Sections/columns** – kanban columns within a board (e.g. To Do / In Progress / Done).
   Needed before tasks so cards have somewhere to live.
8. **Tasks (core)** – task CRUD: title, description, due date, status. Rendered as cards in
   board columns; basic drag-between-columns.
9. **Task collaboration** – assignees (real users), comments/activity feed, followers,
   file attachments.
10. **Task depth** – subtasks, dependencies (blocking/waiting on), tags, custom fields.
11. **More views** – List view and Calendar view for a project (Board view already exists
    from Sprint 7).
12. **Search & personal views** – global search, filters/sorting, "My Tasks" view,
    notifications/inbox.
13. **Automation** – rules (trigger → action), project templates, intake forms.
14. **Reporting** – portfolios, goals, dashboards/charts, workload view.

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

## Sprint 2 tasks: Auth hardening

Schema
- [ ] Add `googleId` (nullable, unique) and `provider` (`local`/`google`) to `users`; make
      `passwordHash` nullable for OAuth-only users.
- [ ] Add `emailVerified` (bool, default false), `emailVerificationToken`,
      `passwordResetToken`, `passwordResetExpiresAt` to `users`.
- [ ] Add a `sessions` table: `id`, `userId`, `refreshTokenHash`, `userAgent`, `createdAt`,
      `expiresAt`, `revokedAt`.
- [ ] Generate and run the DB migration.

Shared package
- [ ] Add Zod schemas: `forgotPasswordSchema`, `resetPasswordSchema`, `verifyEmailSchema`.

API
- [ ] Add a mailer utility (SMTP/Resend) with `sendPasswordResetEmail` /
      `sendVerificationEmail`.
- [ ] `POST /api/auth/forgot-password` – generate + email a reset token.
- [ ] `POST /api/auth/reset-password` – validate token, set new password.
- [ ] `GET /api/auth/google` / `GET /api/auth/google/callback` – Google OAuth login, linking
      to an existing email or creating a new user.
- [ ] `POST /api/auth/verify-email` / `POST /api/auth/resend-verification`.
- [ ] `POST /api/auth/refresh` – rotate refresh token, issue a new access JWT; update
      `POST /api/auth/logout` to revoke the session row.
- [ ] Add `@fastify/rate-limit` to login/signup/forgot-password routes.
- [ ] Add a `requireRole(...roles)` guard usable alongside `authenticate`.
- [ ] Sign the session cookie using `COOKIE_SECRET` (currently unused).
- [ ] Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, mailer
      credentials, `APP_URL`, `REFRESH_TOKEN_TTL`/`ACCESS_TOKEN_TTL` to env config and
      document them.

Frontend
- [ ] Add "Forgot password" / "Reset password" pages + API client calls.
- [ ] Add a "Sign in with Google" button + OAuth redirect handling.
- [ ] Add an email verification banner/page.
- [ ] Handle silent access-token refresh in the API client.

Docs
- [ ] Update the README with the new env vars and auth setup steps.

## Out of scope

Features that exist in real Asana but aren't planned for this clone:

- Native mobile apps
- Third-party integrations (Slack, Google Drive, etc.)
- Enterprise admin console / SSO
