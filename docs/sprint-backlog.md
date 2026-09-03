# Sprint Backlog

This project is built feature-by-feature, in sprints. Each sprint is a complete vertical
slice — schema, API, and UI — that works end-to-end before the next sprint starts.

## Domain hierarchy

The core entity hierarchy, modeled after real Asana (verified against product screenshots —
see `docs/asana-architecture-reference.md` for the conceptual write-up):

```
Workspace
  └── Project
        └── Section
              └── Task
                    └── Subtask
```

A Section always belongs to a Project, and a Project always belongs to a Workspace. **Board
is not a separate entity.** In real Asana, Board / List / Calendar / Timeline / Dashboard /
Overview are all different *view modes* over the same Project's Sections and Tasks — a
kanban column in Board view and a collapsible group in List view are the same Section,
just rendered differently. There is no dedicated `boards` table; views are query/rendering
modes, not containers with their own data.

## Sprint order

1. **Auth & Users** – sign up/login/logout with email + password (bcrypt-hashed), JWT session
   in an httpOnly cookie, a `users` table with a global `role` (admin/member/guest). This
   comes first so every later entity (workspaces, tasks, invites) can be owned by a real user
   from the start.
2. **Auth hardening** – forgot/reset password, Google OAuth login, refresh tokens backed by a
   `sessions` table, rate limiting on auth routes, email verification, role-based route guards,
   and signing the session cookie with the (currently unused) `COOKIE_SECRET`.
3. **Workspaces** – schema, CRUD API, and UI to create/list/switch workspaces. Owned by the
   authenticated user. Root of the domain hierarchy. Also extends the `users` table with
   profile fields shown on the real Profile settings tab and public profile page — `photoUrl`,
   `pronouns`, `jobTitle`, `department`, `aboutMe`, and out-of-office status — plus Account-tab
   essentials: multiple emails per user (one marked "preferred notification email"), "log out
   other sessions" (revoke every `sessions` row for the user except the current one — builds
   directly on Sprint 2's session table), and account deactivation/deletion.
4. **Roles & invites** – an "Invite people" flow: an email-address list plus an optional
   "Add to projects" picker so invitees land directly in specific projects, not just the
   workspace. Workspace-scoped roles (admin/member/guest) and permission checks on workspace
   actions.
5. **Projects** – nested under a workspace (`workspace_id` FK). CRUD API + UI to view
   projects inside a workspace, create/delete a project. Includes basic Overview-tab fields:
   `description` and a `status` enum (on track / at risk / off track) with a "Set status"
   control, matching the real Overview tab.
6. **Sections & Board view** – `sections` table nested under a project (`project_id` FK,
   `position` for ordering), CRUD API, and the Board view UI: sections rendered as kanban
   columns with an "+ Add section" affordance. Replaces the old flat `boards` table entirely
   — this sprint retires it in favor of the Section model above.
7. **Tasks (core)** – task CRUD: title, assignee, a due-date **range** (start date + due date,
   e.g. "31 Aug – 2 Sep" — not just a single due date), and a completion checkbox. A task
   belongs to projects via a `task_projects` join table (`task_id`, `project_id`, `section_id`)
   rather than a single FK, matching real Asana — one task can live in multiple projects at
   once, each with its own section placement. Rendered as cards in Board-view columns; basic
   drag-between-sections. Clicking a card opens the **task detail panel**: a slide-in side
   panel (collapsible back to the board, or expandable to a full page) with "Mark complete",
   assignee, due date, and a description field — this panel is the primary task-editing
   surface and gets built out further in Sprints 8–9.
8. **Task collaboration** – followers, file attachments (an "Attachments" section on the task
   panel), and a comments/activity feed at the bottom of the panel (sortable Oldest/Newest,
   interleaving comments with activity log entries like "changed due date"). Assignee row gets
   a read-state indicator (e.g. "Recently assigned"). Also **Messages**: a project-level
   discussion tab ("Communicate with others," from the same "+" menu as Board/List/Timeline) —
   a simple threaded-post feed scoped to the project, answering the "chat" side of
   collaboration separately from per-task comments.
9. **Task depth** – subtasks (a "Subtasks" section on the task panel), dependencies
   ("Add dependencies" — blocking/waiting on other tasks), and **project-scoped custom field
   definitions** (an admin configures fields like `Priority` (High/Medium/Low),
   `Effort` (Small/Medium/Large), or a freeform tag field like `Category` on a project; a task
   shows that project's field values as colored pills, nested under its entry in the task
   panel's "Projects" list since a multi-project task can have different field values per
   project). Also milestones — a zero-duration task variant shown with a diamond marker,
   listed on the Project Overview tab.
10. **More views** – List view (sortable/groupable table: Name, Assignee, Due date, plus one
    column per custom field, sections as collapsible row-groups) and Calendar view (month
    grid, tasks rendered as date-range bars). Board already ships in Sprint 6.
11. **Search & personal views** – global search, filters/sorting, a "My Tasks" view, and an
    Inbox (Activity / Bookmarks / Archive / @Mentioned tabs, notifications grouped by day with
    an unread indicator). Per-category notification preferences (Project / Portfolio / Goal /
    Email notifications, Do Not Disturb) that control what actually lands in that Inbox.
12. **Automation** – rules (trigger → action), project templates, intake forms.
13. **Reporting** – a customizable per-project Dashboard ("+ Add widget"; stat tiles like
    total/completed/incomplete/overdue tasks, a bar chart of incomplete tasks by section, a
    completion-status donut chart, a task-completion-over-time chart), plus Goals and
    Portfolios that a project can connect to (surfaced on the Overview tab), and a workload
    view.

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
- [x] Add auth API client functions (signup/login/logout/me), sending credentials/cookies.
- [x] Add a `useAuth` hook/context wired to React Query.
- [x] Build a signup form and a login form.
- [x] Show logged-in state (name, role) with a logout button.
- [x] Gate the rest of the app behind authentication.

Docs
- [ ] Update the README with the new env var and any auth setup steps.

## Sprint 2 tasks: Auth hardening

Schema
- [x] Add `googleId` (nullable, unique) and `provider` (`local`/`google`) to `users`; make
      `passwordHash` nullable for OAuth-only users.
- [x] Add `emailVerified` (bool, default false), `emailVerificationToken`,
      `passwordResetToken`, `passwordResetExpiresAt` to `users`.
- [x] Add a `sessions` table: `id`, `userId`, `refreshTokenHash`, `userAgent`, `createdAt`,
      `expiresAt`, `revokedAt`.
- [x] Generate and run the DB migration.

Shared package
- [x] Add Zod schemas: `forgotPasswordSchema`, `resetPasswordSchema`, `verifyEmailSchema`.

API
- [x] Add a mailer utility (SMTP/Resend) with `sendPasswordResetEmail` /
      `sendVerificationEmail`. (Resend HTTP API when `RESEND_API_KEY` is set; logs the email
      to the console in dev otherwise.)
- [x] `POST /api/auth/forgot-password` – generate + email a reset token.
- [x] `POST /api/auth/reset-password` – validate token, set new password.
- [x] `GET /api/auth/google` / `GET /api/auth/google/callback` – Google OAuth login, linking
      to an existing email or creating a new user. (Needs real `GOOGLE_CLIENT_ID`/
      `GOOGLE_CLIENT_SECRET` from Google Cloud Console to actually complete — see README.)
- [x] `POST /api/auth/verify-email` / `POST /api/auth/resend-verification`.
- [x] `POST /api/auth/refresh` – rotate refresh token, issue a new access JWT; update
      `POST /api/auth/logout` to revoke the session row.
- [x] Add `@fastify/rate-limit` to login/signup/forgot-password routes.
- [x] Add a `requireRole(...roles)` guard usable alongside `authenticate`.
- [x] Sign the session cookie using `COOKIE_SECRET` (currently unused).
- [x] Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, mailer
      credentials, `APP_URL`, `REFRESH_TOKEN_TTL`/`ACCESS_TOKEN_TTL` to env config and
      document them.

Frontend
- [x] Add "Forgot password" / "Reset password" pages + API client calls.
- [x] Add a "Sign in with Google" button + OAuth redirect handling.
- [x] Add an email verification banner/page.
- [x] Handle silent access-token refresh in the API client.

Docs
- [x] Update the README with the new env vars and auth setup steps.

## Out of scope

Features that exist in real Asana but aren't planned for this clone:

- Native mobile apps
- Third-party integrations (Slack, Google Drive, etc.)
- Enterprise admin console / SSO
- AI features (AI-generated project/inbox summaries, risk reports) — these need an LLM
  integration that's a separate concern from the rest of this roadmap
- Power-user personalization settings: nav-item customization/reordering, the experimental
  "Hacks" toggles, create-tasks-by-email forwarding, name-pronunciation audio clips, desktop/
  mobile app downloads
- Two-factor authentication and SSO — both need a real auth-provider integration (TOTP/
  authenticator infra, or a SAML/OIDC identity provider) that's a separate concern from the
  rest of this roadmap
