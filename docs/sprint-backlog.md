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
4. **Roles & invites** – an "Invite people" flow: invite by email with a workspace-scoped role
   (admin/member/guest); pending invites tracked separately from membership until accepted.
   Permission checks on workspace actions.
5. **Projects** – nested under a workspace (`workspace_id` FK). CRUD API + UI to view
   projects inside a workspace, create/delete a project. Includes basic Overview-tab fields:
   `description` and a `status` enum (on track / at risk / off track) with a "Set status"
   control, matching the real Overview tab, plus per-project roles/membership. Extends
   Sprint 4's invite modal with an "Add to projects" picker now that projects exist.
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

## Sprint 3 tasks: Workspaces

Schema
- [x] Add a `workspaces` table: `id`, `name`, `ownerId` (FK → `users`), `createdAt`.
- [x] Extend `users` with profile fields: `photoUrl`, `pronouns`, `jobTitle`, `department`,
      `aboutMe`, `outOfOfficeMessage`, `outOfOfficeUntil`, `deactivatedAt` (nullable —
      deactivation marker).
- [x] Add a `user_emails` table: `id`, `userId` (FK), `email` (unique), `isPreferred` (bool,
      default false), `createdAt`.
- [x] Generate and run the DB migration.

Shared package
- [x] Add Zod schemas: `workspaceSchema`, `createWorkspaceSchema`, `updateProfileSchema`,
      `userEmailSchema`, `addEmailSchema`. Extend `userSchema` with the new profile fields.

API
- [x] `POST /api/workspaces` / `GET /api/workspaces` (mine) / `GET /api/workspaces/:id` /
      `PATCH /api/workspaces/:id` / `DELETE /api/workspaces/:id`.
- [x] `PATCH /api/users/me` – update profile fields.
- [x] `POST /api/users/me/emails` / `DELETE /api/users/me/emails/:id` /
      `PATCH /api/users/me/emails/:id/preferred`.
- [x] `POST /api/auth/sessions/revoke-others` – revoke every `sessions` row for the caller
      except the current one (builds on Sprint 2's session table).
- [x] `POST /api/users/me/deactivate` and `DELETE /api/users/me` (account deletion, cascades).

Frontend
- [x] Workspace switcher in the sidebar + "Create workspace" modal.
- [x] Gate the app behind having at least one workspace (create-first-workspace flow).
- [x] Profile settings page: pronouns, job title, department, about me, out-of-office. (Photo
      upload deferred — needs the file-storage infra that Sprint 8's attachments work adds;
      `photoUrl` exists in the schema/API already, just no upload UI yet.)
- [x] Account settings page: manage emails (add/remove/preferred), "Log out other sessions",
      deactivate/delete account (with confirmation).

Docs
- [x] Update the README with the workspace concept and any new setup steps.

## Sprint 4 tasks: Roles & invites

Schema
- [x] Add a `workspace_members` table: `id`, `workspaceId` (FK), `userId` (FK), `role` enum
      (`admin`/`member`/`guest`), `createdAt`. Unique on `(workspaceId, userId)`.
- [x] Add an `invites` table: `id`, `workspaceId` (FK), `email`, `invitedBy` (FK → `users`),
      `role` enum, `token`, `status` enum (`pending`/`accepted`/`expired`/`revoked`),
      `createdAt`, `expiresAt`. Kept separate from `workspace_members` since an invited email
      may not have an account yet.
- [x] Generate and run the DB migration. (Included a data backfill: workspaces created before
      this sprint had no membership row, so each existing owner gets one as `admin`.)

Shared package
- [x] Add Zod schemas: `workspaceRoleSchema`, `inviteSchema` (emails array + role),
      `acceptInviteSchema`. Also `workspaceMemberSchema`, `updateMemberRoleSchema`,
      `pendingInviteSchema`, `acceptedInviteSchema`.

API
- [x] `POST /api/workspaces/:id/invites` – create invite rows for a list of emails, send an
      invite email (reuses Sprint 2's mailer). Skips anyone already a member; re-sends/renews
      an existing pending invite for the same email instead of duplicating it.
- [x] `GET /api/workspaces/:id/invites` – list pending invites.
- [x] `POST /api/invites/:token/accept` – creates the `workspace_members` row, marks the
      invite accepted. Rejects with a clear error if the logged-in account's email doesn't
      match the invite's target email.
- [x] `GET /api/workspaces/:id/members`.
- [x] `PATCH /api/workspaces/:id/members/:userId` / `DELETE /api/workspaces/:id/members/:userId`
      – change role / remove member, gated by an admin check scoped to that workspace's
      membership (not the global `requireRole` decorator, which only covers the user's
      site-wide role — workspace roles are per-workspace). The workspace owner's role can't be
      changed and the owner can't be removed.
- [x] `GET /api/workspaces` and `GET /api/workspaces/:id` now resolve via `workspace_members`
      instead of `ownerId`, so accepted invitees actually see the workspace.

Frontend
- [x] "Invite people" modal: email-address textarea + role select.
- [x] People/Team page: list of members with roles + pending invites. (Built as a modal, same
      pattern as Settings, rather than a separate page — no router exists yet.)
- [x] Accept-invite landing page (from the emailed link).
- [x] Role change / remove-member controls for admins.

Docs
- [x] Update the README with the invite flow.

## Sprint 5 tasks: Projects

Schema
- [x] Add a `projects` table: `id`, `workspaceId` (FK), `name`, `description` (nullable),
      `status` enum (`on_track`/`at_risk`/`off_track`, nullable), `ownerId` (FK → `users`),
      `createdAt`.
- [x] Add a `project_members` table: `id`, `projectId` (FK), `userId` (FK), `role` enum
      (`owner`/`editor`/`commenter`), `createdAt`.
- [x] Generate and run the DB migration.

Shared package
- [x] Add Zod schemas: `projectSchema`, `createProjectSchema`, `updateProjectSchema`,
      `projectStatusSchema`, `projectRoleSchema`. Also `projectMemberSchema`,
      `addProjectMemberSchema`, `updateProjectStatusSchema`.

API
- [x] `POST /api/workspaces/:id/projects` / `GET /api/workspaces/:id/projects` /
      `GET /api/projects/:id` / `PATCH /api/projects/:id` / `DELETE /api/projects/:id`. Access
      is gated by workspace membership (any workspace member can view/create/edit; only the
      project owner can delete). The creator is automatically added as an `owner`
      `project_members` row.
- [x] `PATCH /api/projects/:id/status`.
- [x] `POST /api/projects/:id/members` / `DELETE /api/projects/:id/members/:userId`. The
      target must already be a workspace member; the project owner can't be removed.
- [x] Extend Sprint 4's invite endpoint to accept an optional `projectIds[]` (validated
      against the workspace's actual projects), adding the invitee to those projects as an
      `editor` once they accept.

Frontend
- [x] Projects list page inside a workspace; create/delete project. (Cards show name, status
      dot + label, and a description preview.)
- [x] Project page shell with the Overview/List/Board/Timeline/Dashboard/Calendar tab bar
      (only Overview is implemented this sprint — the rest render as "coming in a later
      sprint" placeholders).
- [x] Overview tab: inline-editable description (autosaves on blur), status pill + "Set
      status" control (On track/At risk/Off track, color-coded, clearable), project roles
      list ("Add member" — picks from workspace members not yet on the project), a
      placeholder "Milestones" section (built out in Sprint 9).
- [x] Extend the invite modal from Sprint 4 with an "Add to projects" chip picker.

Docs
- [x] Update the README with the project concept.

## Sprint 6 tasks: Sections & Board view

Schema
- [x] Add a `sections` table: `id`, `projectId` (FK), `name`, `position` (integer, for
      ordering), `createdAt`.
- [x] Drop the old flat `boards` table entirely (retired in favor of `sections`).
- [x] Generate and run the DB migration.

Shared package
- [x] Add Zod schemas: `sectionSchema`, `createSectionSchema`, `reorderSectionsSchema`.
- [x] Remove `boardSchema`/`createBoardSchema` (`packages/shared/src/board.ts`) and its export
      from `index.ts`.

API
- [x] `POST /api/projects/:id/sections` / `GET /api/projects/:id/sections` /
      `PATCH /api/sections/:id` / `DELETE /api/sections/:id`.
- [x] `PATCH /api/projects/:id/sections/reorder`.
- [x] Remove `boardsRoutes` (`apps/api/src/routes/boards.ts`) and its registration in
      `server.ts`.

Frontend
- [x] Board tab: sections rendered as kanban columns, "+ Add section", drag-to-reorder
      columns. (Native HTML5 drag-and-drop, no new dependency. Columns are empty placeholders
      until Sprint 7 adds tasks.)

Docs
- [x] Update the README noting the schema pivot away from a standalone `boards` table.

## Sprint 7 tasks: Tasks (core)

Schema
- [x] Add a `tasks` table: `id`, `title`, `description` (nullable), `completed` (bool,
      default false), `completedAt` (nullable), `dueDateStart` (nullable), `dueDateEnd`
      (nullable), `assigneeId` (FK → `users`, nullable), `createdBy` (FK → `users`),
      `createdAt`.
- [x] Add a `task_projects` join table: `id`, `taskId` (FK), `projectId` (FK), `sectionId`
      (FK), `position` (integer). Unique on `(taskId, projectId)` — this is how a task can
      belong to multiple projects at once, each with its own section placement.
- [x] Generate and run the DB migration.

Shared package
- [x] Add Zod schemas: `taskSchema`, `createTaskSchema`, `updateTaskSchema`,
      `moveTaskSchema`. (Also added `taskCardSchema`, `taskDetailSchema`, `taskProjectRefSchema`
      for the Board list and detail-panel response shapes.)

API
- [x] `POST /api/tasks` (title + initial `projectId`/`sectionId`).
- [x] `GET /api/projects/:id/tasks` – tasks grouped by section, for Board view.
- [x] `GET /api/tasks/:id` / `PATCH /api/tasks/:id` (title, description, assignee, due date,
      completed) / `DELETE /api/tasks/:id`.
- [x] `PATCH /api/tasks/:id/move` – change section/position, or add/remove a project
      (upserts the `task_projects` row and renumbers both the source and destination
      sections). Added `DELETE /api/tasks/:id/projects/:projectId` for the explicit "remove
      a project" half of this, refusing to remove a task's last remaining project.
- [x] Fixed a gap the Sprint 6 section-delete endpoint left open: deleting a section with
      tasks in it would have hit a foreign-key violation now that `task_projects` exists.
      It now returns 400 until the section is emptied.

Frontend
- [x] Task cards in Board columns (title, assignee avatar, due-date range); "+ Add task" per
      section.
- [x] Drag-and-drop cards between/within sections, persisting position (native HTML5 DnD,
      same approach as Sprint 6's section reordering, disambiguated via drag-state so
      dragging a card doesn't also trigger a section reorder).
- [x] Task detail side panel: header ("Mark complete", close), title, Assignee row, Due date
      row (start/end date pickers), Projects list (a chip per project + section name, add
      another project from the same workspace, remove with inline confirm), Description
      textarea (autosaves on blur). Opens on card click. Scoped down from the original
      bullet: no "Share" button and no collapse/expand-to-full-page — both would need
      infrastructure this app doesn't have yet (a sharing/permissions model beyond project
      membership, and a dedicated full-page task route), so building them would have been
      fake UI.

Docs
- [x] Update the README with the task concept.

## Sprint 8 tasks: Task collaboration

Schema
- [x] Add a `task_followers` join table: `taskId` (FK), `userId` (FK), composite PK.
- [x] Add a `comments` table: `id`, `taskId` (FK), `authorId` (FK), `body`, `createdAt`,
      `editedAt` (nullable).
- [x] Add an `activity_log` table: `id`, `taskId` (FK), `actorId` (FK), `type` (e.g.
      `due_date_changed`, `assignee_changed`, `completed`, `section_changed`), `metadata`
      (jsonb), `createdAt`. Also added a `reopened` type as the natural counterpart to
      `completed` — otherwise un-completing a task would leave no trace in the feed.
- [x] Add an `attachments` table: `id`, `taskId` (FK), `uploadedBy` (FK), `fileName`,
      `fileUrl`, `fileSize`, `mimeType`, `createdAt`.
- [x] Add a `messages` table (project-level): `id`, `projectId` (FK), `authorId` (FK), `body`,
      `createdAt`, `editedAt` (nullable).
- [x] Generate and run the DB migration.
- [x] Fixed two pre-existing gaps found while wiring this up: deleting a task never cleaned
      up its `task_projects`/(now) comments/activity/attachments/followers rows, and deleting
      a project never cascaded to its sections/tasks at all — both would have hit foreign-key
      violations. Both deletes now cascade correctly (a task keeps living if it still belongs
      to another project; only removed outright when this was its last one).

Shared package
- [x] Add Zod schemas: `commentSchema`, `createCommentSchema`, `messageSchema`,
      `createMessageSchema`. Also added `activityEntrySchema`, `attachmentSchema`,
      `addFollowerSchema`, and extended `taskDetailSchema` with `followers`.

API
- [x] `POST /api/tasks/:id/comments` / `GET /api/tasks/:id/comments`.
- [x] `POST /api/tasks/:id/followers` / `DELETE /api/tasks/:id/followers/:userId`.
- [x] `POST /api/tasks/:id/attachments` (multipart upload via `@fastify/multipart`, stored
      under a local `uploads/` dir in dev, 20MB cap) / `GET` / `DELETE` (also removes the file
      from disk).
- [x] `GET /api/tasks/:id/activity`.
- [x] `POST /api/projects/:id/messages` / `GET /api/projects/:id/messages`.
- Note: comments and messages intentionally have no edit/delete endpoints yet — not asked
      for in this sprint, and activity-log entries are meant to be an immutable audit trail.

Frontend
- [x] Comments + activity feed at the bottom of the task panel (Oldest/Newest sort,
      interleaved), with a composer box.
- [x] Attachments section (upload button, file list with download links).
- [x] Followers UI (avatar stack, add/remove self).
- [x] Messages tab on the project page: composer + chronological feed.
- Scoped down: no "read-state indicator" on the assignee row. That needs its own
      per-user/per-task "last viewed" tracking mechanism, which isn't built yet — faking a
      dot that doesn't track anything real would be worse than omitting it.

Docs
- [x] Update the README: note attachment storage is local disk in dev, swap for
      S3-compatible storage in production.

## Sprint 9 tasks: Task depth

Schema
- [x] Add `tasks.parentTaskId` — a nullable self-referential FK (subtasks) and
      `tasks.isMilestone` (bool, default false).
- [x] Add a `task_dependencies` table: `id`, `taskId` (FK), `dependsOnTaskId` (FK). Unique on
      `(taskId, dependsOnTaskId)`.
- [x] Add a `custom_fields` table: `id`, `projectId` (FK), `name`, `type` enum
      (`single_select`/`multi_select`/`text`/`number`), `options` (jsonb — array of
      `{label, color}` for select types), `createdAt`.
- [x] Add a `custom_field_values` table: `id`, `customFieldId` (FK), `taskId` (FK),
      `projectId` (FK — since a multi-project task can have different values per project),
      `value` (jsonb). Unique on `(customFieldId, taskId, projectId)`.
- [x] Generate and run the DB migration.
- [x] Extracted `deleteTaskFully` (`apps/api/src/lib/taskDelete.ts`) so deleting a task
      cascades through subtasks (recursively), dependencies (either direction), and custom
      field values too — used by both the task-delete endpoint and the project-delete
      cascade, so those two paths can't drift out of sync again.

Shared package
- [x] Add Zod schemas: `customFieldSchema`, `createCustomFieldSchema`,
      `customFieldValueSchema` (as `setCustomFieldValuesSchema`/`customFieldValueSchema`),
      `taskDependencySchema` (as `taskDependencyRefSchema`/`taskDependenciesSchema`/
      `createTaskDependencySchema`). Also added `subtaskSchema`/`createSubtaskSchema` and
      `setMilestoneSchema`, and extended `taskProjectRefSchema` with a nested `customFields`
      array per project.

API
- [x] `POST /api/tasks/:id/subtasks` (creates a task with `parentTaskId` set) /
      `GET /api/tasks/:id/subtasks`. Subtask completion/rename/delete reuse the existing
      `PATCH`/`DELETE /api/tasks/:id` endpoints — `requireTaskAccess` now falls back to the
      parent task's access when a task has no project links of its own.
- [x] `POST /api/tasks/:id/dependencies` / `GET /api/tasks/:id/dependencies` (returns both
      `blockedBy` and `blocking`, not in the original bullet list but needed to render
      either direction) / `DELETE /api/tasks/:id/dependencies/:dependencyId`.
- [x] `POST /api/projects/:id/custom-fields` / `GET` / `PATCH` / `DELETE`.
- [x] `PUT /api/tasks/:id/custom-field-values` (scoped to a project).
- [x] `PATCH /api/tasks/:id/milestone` (toggle).

Frontend
- [x] Subtasks section on the task panel: add input, checklist-style list with its own
      completion state.
- [x] Dependencies row: "Add dependencies" picker (search tasks, blocking/waiting-on).
      Scoped down: search is limited to the task's own (first) linked project rather than
      across every project, to avoid an open-ended cross-project search UI.
- [x] Custom fields table on the task panel: colored pills per field type, nested under each
      project the task belongs to.
- [x] Custom-field admin UI (create/edit/delete fields + options/colors) — added to the
      Overview tab rather than a separate "Project settings" surface, since Overview is
      already this project's settings/config hub (status, description, roles). Field and
      option **reordering** is out of scope for this pass — noted here rather than silently
      dropped.
- [x] Milestone diamond marker on cards/panel; wired up the Overview tab's "Milestones" list
      (clicking a milestone opens its task panel).

Docs
- [x] Update the README with the task-depth concepts.

## Sprint 10 tasks: More views

Schema
- [x] None — List and Calendar are read/query modes over existing `sections`/`tasks` data.

API
- [x] `GET /api/projects/:id/tasks` now returns each card's `customFieldValues`
      (`customFieldId`/`value` pairs) alongside the existing fields, so the List tab can
      render a column per custom field from the one existing endpoint.
      Scoped down: no new `view`/`sort`/`group` query params, and no separate
      `view=calendar&month=...` endpoint. List's sort/group and Calendar's date-range
      bucketing are both done client-side over the existing full-project task list, since
      this project's task counts don't call for server-side paging/filtering yet — adding
      query-param plumbing ahead of that need would be speculative.

Frontend
- [x] List tab (`ListTab.tsx`): sortable table (Name/Assignee/Due date, click a header to
      toggle sort direction) with one column per project custom field, sections rendered as
      collapsible row-groups (row count per group, click to collapse/expand).
- [x] Calendar tab (`CalendarTab.tsx`): month grid with prev/next/Today navigation, tasks
      rendered as chips on every day within their due-date range (built with timezone-safe
      date-key slicing, not `Date` round-tripping, to avoid off-by-one-day bugs), a "+" quick-add
      per day that creates the task in the project's first section and sets both due-date
      bounds to that day, today's cell highlighted.
      Scoped down: date-range tasks render as a chip repeated on each day rather than a
      single spanning bar across the week grid — a true multi-day bar needs row-spanning
      layout math that's a bigger lift than this pass's scope.
- [x] Project tab bar now has Board, List, and Calendar all live.

Docs
- [x] Update the README.

Bug fixed during this pass: `ListTab`'s `gridTemplateColumns` interpolated
`repeat(${fields.length}, 130px)` unconditionally, which produced the invalid
`repeat(0, 130px)` for any project with zero custom fields — invalid CSS silently drops the
whole `grid-template-columns` declaration, collapsing the table to stacked single-column
rows. Fixed with a conditional that omits the `repeat()` clause when there are no fields.

## Sprint 11 tasks: Search & personal views

Schema
- [ ] Add a `notifications` table: `id`, `userId` (FK), `type`, `taskId` (FK, nullable),
      `projectId` (FK, nullable), `actorId` (FK, nullable), `read` (bool, default false),
      `createdAt`.
- [ ] Add a `notification_preferences` table: `id`, `userId` (FK), `category` enum
      (`project`/`portfolio`/`goal`/`email`), `enabled` (bool, default true). Unique on
      `(userId, category)`.
- [ ] Add `users.doNotDisturbUntil` (nullable timestamp).
- [ ] Generate and run the DB migration.

Shared package
- [ ] Add Zod schemas: `notificationSchema`, `notificationPreferenceSchema`.

API
- [ ] `GET /api/search?q=` (tasks + projects, simple `ILIKE` search to start).
- [ ] `GET /api/me/tasks` – tasks assigned to the caller across projects ("My Tasks").
- [ ] `GET /api/me/notifications` (grouped by day) / `PATCH /api/me/notifications/:id/read` /
      `POST /api/me/notifications/archive-all`.
- [ ] `PATCH /api/me/notification-preferences`.

Frontend
- [ ] Global search bar + results.
- [ ] "My Tasks" page.
- [ ] Inbox: Activity/Bookmarks/Archive/@Mentioned tabs, day-grouped notification list with
      an unread indicator, "Archive all notifications".
- [ ] Notification-preferences section in settings (per-category toggles + Do Not Disturb).

Docs
- [ ] Update the README.

## Sprint 12 tasks: Automation

Schema
- [ ] Add an `automation_rules` table: `id`, `projectId` (FK), `name`, `trigger` (jsonb),
      `action` (jsonb), `enabled` (bool, default true), `createdBy` (FK), `createdAt`.
- [ ] Add a `project_templates` table: `id`, `workspaceId` (FK, nullable — null means
      built-in), `name`, `description`, `sectionsSnapshot` (jsonb), `createdBy`, `createdAt`.
- [ ] Add an `intake_forms` table: `id`, `projectId` (FK), `name`, `fieldsSchema` (jsonb),
      `createdAt`.
- [ ] Generate and run the DB migration.

Shared package
- [ ] Add Zod schemas: `automationRuleSchema`, `projectTemplateSchema`, `intakeFormSchema`.

API
- [ ] CRUD `/api/projects/:id/automation-rules`; a small rule-evaluation runner triggered on
      relevant task events (move/complete/etc.) that checks matching rules and applies their
      actions.
- [ ] CRUD `/api/project-templates`; `POST /api/projects` accepts an optional
      `templateId` to seed sections from a template.
- [ ] CRUD `/api/projects/:id/intake-forms`; a public
      `POST /api/intake-forms/:id/submit` that creates a task from form input.

Frontend
- [ ] Rule builder UI (trigger picker + action picker).
- [ ] Template gallery in the "create project" flow.
- [ ] Intake form builder + a public submission page.

Docs
- [ ] Update the README.

## Sprint 13 tasks: Reporting

Schema
- [ ] Add a `goals` table: `id`, `workspaceId` (FK), `name`, `status` enum, `ownerId` (FK),
      `dueDate` (nullable), `createdAt`.
- [ ] Add a `project_goals` join table: `projectId` (FK), `goalId` (FK), composite PK.
- [ ] Add a `portfolios` table: `id`, `workspaceId` (FK), `name`, `ownerId` (FK), `createdAt`.
- [ ] Add a `portfolio_projects` join table: `portfolioId` (FK), `projectId` (FK), composite
      PK.
- [ ] Add a `dashboard_widgets` table: `id`, `projectId` (FK), `type` enum
      (`stat_tile`/`bar_chart`/`donut_chart`/`area_chart`), `config` (jsonb), `position`,
      `createdAt`.
- [ ] Generate and run the DB migration.

Shared package
- [ ] Add Zod schemas: `goalSchema`, `portfolioSchema`, `dashboardWidgetSchema`.

API
- [ ] CRUD `/api/goals`, CRUD `/api/portfolios`.
- [ ] `POST`/`DELETE /api/projects/:id/goals`, `/api/projects/:id/portfolios` (connect/
      disconnect — surfaced on the Overview tab).
- [ ] `GET /api/projects/:id/dashboard/stats` – completed/incomplete/overdue/total counts and
      chart data, computed from `tasks`.
- [ ] CRUD `/api/projects/:id/dashboard/widgets`.
- [ ] `GET /api/workspaces/:id/workload` – tasks-per-assignee aggregate.

Frontend
- [ ] Dashboard tab: widget grid, "+ Add widget" picker, stat tiles, bar/donut/area charts.
- [ ] Goals & Portfolios pages; "Connect goal"/"Connect portfolio" on the project Overview
      tab.
- [ ] Workload view (tasks per assignee).

Docs
- [ ] Update the README.

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
