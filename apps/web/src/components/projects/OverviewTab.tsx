import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "@phosphor-icons/react";
import type { Project, ProjectRole } from "@asanaClone/shared";
import { listMembers } from "../../lib/members";
import {
  addProjectMember,
  listProjectMembers,
  removeProjectMember,
  updateProject,
  updateProjectStatus,
} from "../../lib/projects";
import { Avatar } from "../common/Avatar";
import { STATUS_DOT_CLASS, STATUS_LABEL, STATUS_OPTIONS } from "./status";

interface OverviewTabProps {
  project: Project;
}

export function OverviewTab({ project }: OverviewTabProps) {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState(project.description ?? "");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  const membersQuery = useQuery({
    queryKey: ["projects", project.id, "members"],
    queryFn: () => listProjectMembers(project.id),
  });
  const workspaceMembersQuery = useQuery({
    queryKey: ["workspaces", project.workspaceId, "members"],
    queryFn: () => listMembers(project.workspaceId),
  });
  const members = membersQuery.data ?? [];
  const workspaceMembers = workspaceMembersQuery.data ?? [];
  const addableMembers = workspaceMembers.filter(
    (wm) => !members.some((pm) => pm.userId === wm.userId),
  );

  const invalidateProject = () =>
    queryClient.invalidateQueries({ queryKey: ["projects", project.id] });

  const descriptionMutation = useMutation({
    mutationFn: (description: string) => updateProject(project.id, { description }),
    onSuccess: invalidateProject,
  });

  const statusMutation = useMutation({
    mutationFn: (status: Project["status"]) => updateProjectStatus(project.id, { status }),
    onSuccess: () => {
      invalidateProject();
      setStatusMenuOpen(false);
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: ProjectRole }) =>
      addProjectMember(project.id, { userId, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", project.id, "members"] });
      setAddMemberOpen(false);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: number) => removeProjectMember(project.id, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects", project.id, "members"] }),
  });

  function handleDescriptionBlur() {
    if (description !== (project.description ?? "")) {
      descriptionMutation.mutate(description);
    }
  }

  function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const userId = Number(formData.get("userId"));
    const role = formData.get("role") as ProjectRole;
    if (!userId) return;
    addMemberMutation.mutate({ userId, role });
  }

  return (
    <div className="overview-tab">
      <section className="overview-tab__status-row">
        <span className="overview-tab__label">Status</span>
        <div className="overview-tab__status-picker">
          <button
            type="button"
            className="overview-tab__status-trigger"
            onClick={() => setStatusMenuOpen((v) => !v)}
          >
            {project.status ? (
              <>
                <span className={`project-status-dot ${STATUS_DOT_CLASS[project.status]}`} />
                {STATUS_LABEL[project.status]}
              </>
            ) : (
              "Set status"
            )}
          </button>
          {statusMenuOpen && (
            <div className="overview-tab__status-menu">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => statusMutation.mutate(option)}
                >
                  <span className={`project-status-dot ${STATUS_DOT_CLASS[option]}`} />
                  {STATUS_LABEL[option]}
                </button>
              ))}
              {project.status && (
                <button type="button" onClick={() => statusMutation.mutate(null)}>
                  Clear status
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <section>
        <h3 className="overview-tab__label">Description</h3>
        <textarea
          className="overview-tab__description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          onBlur={handleDescriptionBlur}
          placeholder="What's this project about?"
          rows={4}
        />
      </section>

      <section className="settings-section">
        <h3>Project roles</h3>
        <ul className="people-list">
          {members.map((member) => (
            <li key={member.userId}>
              <Avatar name={member.name} userKey={member.userId} size={26} />
              <span className="people-list__name">
                {member.name} <span className="people-list__email">{member.email}</span>
              </span>
              <span className="people-list__role">{member.role}</span>
              {member.role !== "owner" && (
                <button
                  type="button"
                  className="settings-icon-button"
                  onClick={() => removeMemberMutation.mutate(member.userId)}
                  aria-label={`Remove ${member.name}`}
                >
                  <X size={14} weight="bold" />
                </button>
              )}
            </li>
          ))}
        </ul>
        {addMemberOpen ? (
          <form className="overview-tab__add-member-form" onSubmit={handleAddMember}>
            <select name="userId" defaultValue="">
              <option value="" disabled>
                Choose a workspace member
              </option>
              {addableMembers.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.name}
                </option>
              ))}
            </select>
            <select name="role" defaultValue="editor">
              <option value="editor">Editor</option>
              <option value="commenter">Commenter</option>
            </select>
            <button type="submit" disabled={addMemberMutation.isPending || addableMembers.length === 0}>
              Add
            </button>
            <button type="button" onClick={() => setAddMemberOpen(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <button type="button" onClick={() => setAddMemberOpen(true)}>
            Add member
          </button>
        )}
      </section>

      <section className="settings-section">
        <h3>Milestones</h3>
        <p className="overview-tab__empty">Milestones are coming in a later sprint.</p>
      </section>
    </div>
  );
}
