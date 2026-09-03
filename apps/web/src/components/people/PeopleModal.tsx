import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "@phosphor-icons/react";
import type { WorkspaceRole } from "@asanaClone/shared";
import {
  listMembers,
  listPendingInvites,
  removeMember,
  sendInvites,
  updateMemberRole,
} from "../../lib/members";
import { listProjects } from "../../lib/projects";
import { useAuth } from "../../hooks/AuthContext";
import { Avatar } from "../common/Avatar";

interface PeopleModalProps {
  workspaceId: number;
  onClose: () => void;
}

const ROLES: WorkspaceRole[] = ["admin", "member", "guest"];

function parseEmails(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\s,]+/)
        .map((email) => email.trim())
        .filter((email) => email.includes("@")),
    ),
  );
}

export function PeopleModal({ workspaceId, onClose }: PeopleModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [emailsInput, setEmailsInput] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("member");
  const [selectedProjectIds, setSelectedProjectIds] = useState<number[]>([]);

  const membersQuery = useQuery({
    queryKey: ["workspaces", workspaceId, "members"],
    queryFn: () => listMembers(workspaceId),
  });
  const invitesQuery = useQuery({
    queryKey: ["workspaces", workspaceId, "invites"],
    queryFn: () => listPendingInvites(workspaceId),
  });
  const projectsQuery = useQuery({
    queryKey: ["workspaces", workspaceId, "projects"],
    queryFn: () => listProjects(workspaceId),
  });

  const members = membersQuery.data ?? [];
  const pendingInvites = invitesQuery.data ?? [];
  const projects = projectsQuery.data ?? [];
  const me = members.find((m) => m.userId === user?.id);
  const isAdmin = me?.role === "admin";

  function toggleProject(projectId: number) {
    setSelectedProjectIds((current) =>
      current.includes(projectId)
        ? current.filter((id) => id !== projectId)
        : [...current, projectId],
    );
  }

  const inviteMutation = useMutation({
    mutationFn: (emails: string[]) =>
      sendInvites(workspaceId, {
        emails,
        role,
        projectIds: selectedProjectIds.length > 0 ? selectedProjectIds : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces", workspaceId, "invites"] });
      setEmailsInput("");
      setSelectedProjectIds([]);
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: WorkspaceRole }) =>
      updateMemberRole(workspaceId, userId, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workspaces", workspaceId, "members"] }),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: number) => removeMember(workspaceId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workspaces", workspaceId, "members"] }),
  });

  function handleInvite(event: FormEvent) {
    event.preventDefault();
    const emails = parseEmails(emailsInput);
    if (emails.length === 0) return;
    inviteMutation.mutate(emails);
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-label="People"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="settings-modal__header">
          <h2>People</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={20} weight="bold" />
          </button>
        </header>
        <div className="settings-modal__content" style={{ maxWidth: 560 }}>
          {isAdmin && (
            <form className="people-invite-form" onSubmit={handleInvite}>
              <label>
                Invite people
                <textarea
                  value={emailsInput}
                  onChange={(event) => setEmailsInput(event.target.value)}
                  placeholder="name@example.com, name@example.com"
                  rows={2}
                />
              </label>
              {projects.length > 0 && (
                <div className="people-invite-form__projects">
                  <span className="people-invite-form__projects-label">Add to projects</span>
                  <div className="people-invite-form__chips">
                    {projects.map((project) => (
                      <button
                        type="button"
                        key={project.id}
                        className={
                          selectedProjectIds.includes(project.id)
                            ? "project-chip project-chip--selected"
                            : "project-chip"
                        }
                        onClick={() => toggleProject(project.id)}
                      >
                        {project.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="people-invite-form__row">
                <select value={role} onChange={(event) => setRole(event.target.value as WorkspaceRole)}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="auth-form__primary-button"
                  disabled={inviteMutation.isPending || parseEmails(emailsInput).length === 0}
                >
                  {inviteMutation.isPending ? "Sending…" : "Send invite"}
                </button>
              </div>
              {inviteMutation.isError && (
                <p className="auth-error" role="alert">
                  {inviteMutation.error.message}
                </p>
              )}
            </form>
          )}

          <section className="settings-section">
            <h3>Members</h3>
            <ul className="people-list">
              {members.map((member) => (
                <li key={member.userId}>
                  <Avatar name={member.name} userKey={member.userId} size={26} />
                  <span className="people-list__name">
                    {member.name} <span className="people-list__email">{member.email}</span>
                  </span>
                  {isAdmin && member.userId !== user?.id ? (
                    <select
                      value={member.role}
                      onChange={(event) =>
                        roleMutation.mutate({
                          userId: member.userId,
                          role: event.target.value as WorkspaceRole,
                        })
                      }
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="people-list__role">{member.role}</span>
                  )}
                  {isAdmin && member.userId !== user?.id && (
                    <button
                      type="button"
                      className="settings-icon-button"
                      onClick={() => removeMutation.mutate(member.userId)}
                      aria-label={`Remove ${member.name}`}
                    >
                      <X size={16} weight="bold" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {pendingInvites.length > 0 && (
            <section className="settings-section">
              <h3>Pending invites</h3>
              <ul className="people-list">
                {pendingInvites.map((invite) => (
                  <li key={invite.id}>
                    <span className="people-list__name">{invite.email}</span>
                    <span className="settings-email-badge">Pending</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
