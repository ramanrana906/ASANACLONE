import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Diamond, X } from "@phosphor-icons/react";
import type { Project, ProjectRole } from "@asanaClone/shared";
import { listMembers } from "../../lib/members";
import {
  addProjectMember,
  listProjectMembers,
  removeProjectMember,
  updateProject,
  updateProjectStatus,
} from "../../lib/projects";
import { listProjectTasks } from "../../lib/tasks";
import { Avatar } from "../common/Avatar";
import { ConfirmIconButton } from "../common/ConfirmIconButton";
import { STATUS_DOT_CLASS, STATUS_LABEL, STATUS_OPTIONS } from "./status";
import { CustomFieldsAdmin } from "./CustomFieldsAdmin";
import { TaskDetailPanel } from "../tasks/TaskDetailPanel";

interface OverviewTabProps {
  project: Project;
}

export function OverviewTab({ project }: OverviewTabProps) {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState(project.description ?? "");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);

  const membersQuery = useQuery({
    queryKey: ["projects", project.id, "members"],
    queryFn: () => listProjectMembers(project.id),
  });
  const workspaceMembersQuery = useQuery({
    queryKey: ["workspaces", project.workspaceId, "members"],
    queryFn: () => listMembers(project.workspaceId),
  });
  const tasksQuery = useQuery({
    queryKey: ["projects", project.id, "tasks"],
    queryFn: () => listProjectTasks(project.id),
  });
  const members = membersQuery.data ?? [];
  const workspaceMembers = workspaceMembersQuery.data ?? [];
  const addableMembers = workspaceMembers.filter(
    (wm) => !members.some((pm) => pm.userId === wm.userId),
  );
  const milestones = (tasksQuery.data ?? []).filter((task) => task.isMilestone);

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

  const owner = members.find((member) => member.role === "owner");
  const created = new Date(project.createdAt).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="overview-tab">
      <div className="overview-tab__main">
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
                  <ConfirmIconButton
                    icon={<X size={14} weight="bold" />}
                    label={`Remove ${member.name}`}
                    onConfirm={() => removeMemberMutation.mutate(member.userId)}
                    disabled={removeMemberMutation.isPending}
                  />
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
          {milestones.length === 0 ? (
            <p className="overview-tab__empty">
              No milestones yet. Mark a task as a milestone from its detail panel.
            </p>
          ) : (
            <ul className="overview-tab__milestones">
              {milestones.map((task) => (
                <li key={task.id}>
                  <button
                    type="button"
                    className="overview-tab__milestone"
                    onClick={() => setOpenTaskId(task.id)}
                  >
                    <Diamond size={13} weight="fill" className="overview-tab__milestone-icon" />
                    <span className={task.completed ? "is-done" : ""}>{task.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <CustomFieldsAdmin projectId={project.id} />
      </div>

      <aside className="overview-tab__side">
        <div className="overview-tab__details-card">
          <h3 className="overview-tab__label">Details</h3>
          <dl className="overview-tab__details-list">
            <div>
              <dt>Owner</dt>
              <dd>
                {owner ? (
                  <span className="overview-tab__details-person">
                    <Avatar name={owner.name} userKey={owner.userId} size={20} />
                    {owner.name}
                  </span>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt>Members</dt>
              <dd>{members.length}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{created}</dd>
            </div>
          </dl>
        </div>
      </aside>

      {openTaskId !== null && (
        <TaskDetailPanel
          taskId={openTaskId}
          workspaceId={project.workspaceId}
          onClose={() => setOpenTaskId(null)}
        />
      )}
    </div>
  );
}
