import { useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Circle, Diamond, Paperclip, Trash, X } from "@phosphor-icons/react";
import type {
  ActivityEntry,
  Comment,
  Project,
  TaskDetail,
  UpdateTaskInput,
} from "@asanaClone/shared";
import { useAuth } from "../../hooks/AuthContext";
import { listMembers } from "../../lib/members";
import { listProjects } from "../../lib/projects";
import { listSections } from "../../lib/sections";
import {
  deleteTask,
  getTask,
  moveTask,
  removeTaskFromProject,
  setMilestone,
  updateTask,
} from "../../lib/tasks";
import { addFollower, removeFollower } from "../../lib/followers";
import { createComment, listComments } from "../../lib/comments";
import { listActivity } from "../../lib/activity";
import {
  attachmentDownloadUrl,
  deleteAttachment,
  formatFileSize,
  listAttachments,
  uploadAttachment,
} from "../../lib/attachments";
import { Avatar } from "../common/Avatar";
import { AvatarStack } from "../common/AvatarStack";
import { ProjectIcon } from "../common/ProjectIcon";
import { ConfirmIconButton } from "../common/ConfirmIconButton";
import { SubtasksSection } from "./SubtasksSection";
import { DependenciesSection } from "./DependenciesSection";
import { CustomFieldsSection } from "./CustomFieldsSection";

interface TaskDetailPanelProps {
  taskId: number;
  workspaceId: number;
  onClose: () => void;
}

export function TaskDetailPanel({ taskId, workspaceId, onClose }: TaskDetailPanelProps) {
  const taskQuery = useQuery({
    queryKey: ["tasks", taskId],
    queryFn: () => getTask(taskId),
  });

  return (
    <div className="task-panel-overlay" onClick={onClose}>
      <div
        className="task-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Task details"
        onClick={(event) => event.stopPropagation()}
      >
        {taskQuery.isLoading || !taskQuery.data ? (
          <p aria-live="polite" className="task-panel__loading">
            Loading…
          </p>
        ) : (
          <TaskDetailPanelContent
            key={taskQuery.data.id}
            task={taskQuery.data}
            workspaceId={workspaceId}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

function AddProjectControl({
  addableProjects,
  onAdd,
  onCancel,
}: {
  addableProjects: Project[];
  onAdd: (projectId: number, sectionId: number) => void;
  onCancel: () => void;
}) {
  const [projectId, setProjectId] = useState<number | "">("");
  const [sectionId, setSectionId] = useState<number | "">("");

  const sectionsQuery = useQuery({
    queryKey: ["projects", projectId, "sections"],
    queryFn: () => listSections(projectId as number),
    enabled: typeof projectId === "number",
  });

  return (
    <div className="task-project-add">
      <select
        value={projectId}
        onChange={(event) => {
          setProjectId(event.target.value ? Number(event.target.value) : "");
          setSectionId("");
        }}
        autoFocus
      >
        <option value="">Choose a project</option>
        {addableProjects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
      {typeof projectId === "number" && (
        <select
          value={sectionId}
          onChange={(event) => setSectionId(event.target.value ? Number(event.target.value) : "")}
        >
          <option value="">Choose a section</option>
          {(sectionsQuery.data ?? []).map((section) => (
            <option key={section.id} value={section.id}>
              {section.name}
            </option>
          ))}
        </select>
      )}
      {typeof projectId === "number" && typeof sectionId === "number" && (
        <button type="button" onClick={() => onAdd(projectId, sectionId)}>
          Add
        </button>
      )}
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}

function formatFeedTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function describeActivity(entry: ActivityEntry): string {
  switch (entry.type) {
    case "assignee_changed":
      return "changed the assignee";
    case "due_date_changed":
      return "changed the due date";
    case "completed":
      return "marked this task complete";
    case "reopened":
      return "marked this task incomplete";
    case "section_changed":
      return "moved this task";
    default:
      return "updated this task";
  }
}

function CommentItem({ comment }: { comment: Comment }) {
  return (
    <div className="task-feed-item">
      <Avatar name={comment.author.name} userKey={comment.author.id} size={22} />
      <div className="task-feed-item__body">
        <div className="task-feed-item__header">
          <span className="task-feed-item__author">{comment.author.name}</span>
          <span className="task-feed-item__time">{formatFeedTime(comment.createdAt)}</span>
        </div>
        <p className="task-feed-item__text">{comment.body}</p>
      </div>
    </div>
  );
}

function ActivityItem({ entry }: { entry: ActivityEntry }) {
  return (
    <div className="task-feed-item task-feed-item--activity">
      <span className="task-feed-item__activity-dot" />
      <p className="task-feed-item__activity-text">
        <span className="task-feed-item__author">{entry.actor.name}</span> {describeActivity(entry)}
        <span className="task-feed-item__time"> · {formatFeedTime(entry.createdAt)}</span>
      </p>
    </div>
  );
}

function TaskDetailPanelContent({
  task,
  workspaceId,
  onClose,
}: {
  task: TaskDetail;
  workspaceId: number;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [addingProject, setAddingProject] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [feedOrder, setFeedOrder] = useState<"asc" | "desc">("asc");

  const workspaceMembersQuery = useQuery({
    queryKey: ["workspaces", workspaceId, "members"],
    queryFn: () => listMembers(workspaceId),
  });
  const workspaceProjectsQuery = useQuery({
    queryKey: ["workspaces", workspaceId, "projects"],
    queryFn: () => listProjects(workspaceId),
  });
  const attachmentsQuery = useQuery({
    queryKey: ["tasks", task.id, "attachments"],
    queryFn: () => listAttachments(task.id),
  });
  const commentsQuery = useQuery({
    queryKey: ["tasks", task.id, "comments"],
    queryFn: () => listComments(task.id),
  });
  const activityQuery = useQuery({
    queryKey: ["tasks", task.id, "activity"],
    queryFn: () => listActivity(task.id),
  });

  function invalidateTask() {
    queryClient.invalidateQueries({ queryKey: ["tasks", task.id] });
    for (const project of task.projects) {
      queryClient.invalidateQueries({ queryKey: ["projects", project.projectId, "tasks"] });
    }
  }

  const updateMutation = useMutation({
    mutationFn: (input: UpdateTaskInput) => updateTask(task.id, input),
    onSuccess: () => {
      invalidateTask();
      queryClient.invalidateQueries({ queryKey: ["tasks", task.id, "activity"] });
    },
  });

  const moveMutation = useMutation({
    mutationFn: ({ projectId, sectionId }: { projectId: number; sectionId: number }) =>
      moveTask(task.id, { projectId, sectionId, position: 0 }),
    onSuccess: () => {
      invalidateTask();
      setAddingProject(false);
    },
  });

  const removeProjectMutation = useMutation({
    mutationFn: (projectId: number) => removeTaskFromProject(task.id, projectId),
    onSuccess: invalidateTask,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(task.id),
    onSuccess: () => {
      invalidateTask();
      onClose();
    },
  });

  const milestoneMutation = useMutation({
    mutationFn: (isMilestone: boolean) => setMilestone(task.id, { isMilestone }),
    onSuccess: invalidateTask,
  });

  const followMutation = useMutation({
    mutationFn: (follow: boolean) =>
      follow ? addFollower(task.id, user!.id) : removeFollower(task.id, user!.id),
    onSuccess: invalidateTask,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadAttachment(task.id, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", task.id, "attachments"] }),
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: number) => deleteAttachment(attachmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", task.id, "attachments"] }),
  });

  const commentMutation = useMutation({
    mutationFn: (body: string) => createComment(task.id, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", task.id, "comments"] });
      setCommentBody("");
    },
  });

  function commitTitle() {
    const trimmed = title.trim();
    if (trimmed && trimmed !== task.title) {
      updateMutation.mutate({ title: trimmed });
    } else {
      setTitle(task.title);
    }
  }

  function commitDescription() {
    if (description !== (task.description ?? "")) {
      updateMutation.mutate({ description: description || null });
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    event.target.value = "";
  }

  function handleCommentSubmit(event: FormEvent) {
    event.preventDefault();
    if (!commentBody.trim()) return;
    commentMutation.mutate(commentBody.trim());
  }

  const members = workspaceMembersQuery.data ?? [];
  const linkedProjectIds = new Set(task.projects.map((p) => p.projectId));
  const addableProjects = (workspaceProjectsQuery.data ?? []).filter(
    (project) => !linkedProjectIds.has(project.id),
  );
  const isFollowing = user ? task.followers.some((follower) => follower.id === user.id) : false;

  const feedItems = useMemo(() => {
    const items: Array<{ id: string; createdAt: string; node: ReactNode }> = [];
    for (const comment of commentsQuery.data ?? []) {
      items.push({
        id: `comment-${comment.id}`,
        createdAt: comment.createdAt,
        node: <CommentItem comment={comment} />,
      });
    }
    for (const entry of activityQuery.data ?? []) {
      items.push({
        id: `activity-${entry.id}`,
        createdAt: entry.createdAt,
        node: <ActivityItem entry={entry} />,
      });
    }
    items.sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return feedOrder === "asc" ? diff : -diff;
    });
    return items;
  }, [commentsQuery.data, activityQuery.data, feedOrder]);

  return (
    <>
      <header className="task-panel__header">
        <div className="task-panel__header-left">
          <button
            type="button"
            className={task.completed ? "task-panel__complete is-done" : "task-panel__complete"}
            onClick={() => updateMutation.mutate({ completed: !task.completed })}
          >
            {task.completed ? <CheckCircle size={16} weight="fill" /> : <Circle size={16} />}
            {task.completed ? "Completed" : "Mark complete"}
          </button>
          <button
            type="button"
            className={
              task.isMilestone ? "task-panel__milestone is-active" : "task-panel__milestone"
            }
            onClick={() => milestoneMutation.mutate(!task.isMilestone)}
          >
            <Diamond size={14} weight={task.isMilestone ? "fill" : "regular"} />
            Milestone
          </button>
        </div>
        <button type="button" className="task-panel__close" onClick={onClose} aria-label="Close task">
          <X size={18} weight="bold" />
        </button>
      </header>

      <div className="task-panel__content">
        <textarea
          className="task-panel__title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={commitTitle}
          rows={1}
        />

        <div className="task-panel__row">
          <span className="task-panel__row-label">Assignee</span>
          {task.assignee && <Avatar name={task.assignee.name} userKey={task.assignee.id} size={22} />}
          <select
            value={task.assignee?.id ?? ""}
            onChange={(event) =>
              updateMutation.mutate({
                assigneeId: event.target.value ? Number(event.target.value) : null,
              })
            }
          >
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.name}
              </option>
            ))}
          </select>
        </div>

        <div className="task-panel__row">
          <span className="task-panel__row-label">Followers</span>
          <AvatarStack
            people={task.followers.map((follower) => ({ id: follower.id, name: follower.name }))}
            size={22}
            max={5}
          />
          <button
            type="button"
            className="task-panel__follow-toggle"
            onClick={() => followMutation.mutate(!isFollowing)}
            disabled={followMutation.isPending}
          >
            {isFollowing ? "Following" : "Follow"}
          </button>
        </div>

        <div className="task-panel__row">
          <span className="task-panel__row-label">Due date</span>
          <div className="task-panel__date-range">
            <input
              type="date"
              value={task.dueDateStart ? task.dueDateStart.slice(0, 10) : ""}
              onChange={(event) =>
                updateMutation.mutate({ dueDateStart: event.target.value || null })
              }
            />
            <span>–</span>
            <input
              type="date"
              value={task.dueDateEnd ? task.dueDateEnd.slice(0, 10) : ""}
              onChange={(event) => updateMutation.mutate({ dueDateEnd: event.target.value || null })}
            />
          </div>
        </div>

        <div className="task-panel__row task-panel__row--projects">
          <span className="task-panel__row-label">Projects</span>
          <div className="task-panel__project-chips">
            {task.projects.map((project) => (
              <span className="task-project-chip" key={project.projectId}>
                <ProjectIcon projectKey={project.projectId} size={14} />
                {project.projectName}
                <span className="task-project-chip__section">{project.sectionName}</span>
                {task.projects.length > 1 && (
                  <ConfirmIconButton
                    icon={<X size={11} weight="bold" />}
                    label={`Remove from ${project.projectName}`}
                    onConfirm={() => removeProjectMutation.mutate(project.projectId)}
                  />
                )}
              </span>
            ))}
          </div>
          {addingProject ? (
            <AddProjectControl
              addableProjects={addableProjects}
              onAdd={(projectId, sectionId) => moveMutation.mutate({ projectId, sectionId })}
              onCancel={() => setAddingProject(false)}
            />
          ) : (
            addableProjects.length > 0 && (
              <button
                type="button"
                className="task-panel__add-project"
                onClick={() => setAddingProject(true)}
              >
                Add to another project
              </button>
            )
          )}
        </div>

        <CustomFieldsSection taskId={task.id} projects={task.projects} />

        <SubtasksSection taskId={task.id} />

        {task.projects[0] && (
          <DependenciesSection taskId={task.id} projectId={task.projects[0].projectId} />
        )}

        <div className="task-panel__row task-panel__row--description">
          <span className="task-panel__row-label">Description</span>
          <textarea
            className="task-panel__description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            onBlur={commitDescription}
            placeholder="What's this task about?"
            rows={4}
          />
        </div>

        <div className="task-panel__row task-panel__row--attachments">
          <span className="task-panel__row-label">Attachments</span>
          {(attachmentsQuery.data ?? []).length > 0 && (
            <div className="task-panel__attachments-list">
              {(attachmentsQuery.data ?? []).map((attachment) => (
                <div className="task-attachment" key={attachment.id}>
                  <Paperclip size={14} weight="bold" />
                  <a
                    href={attachmentDownloadUrl(attachment)}
                    className="task-attachment__name"
                    title={attachment.fileName}
                  >
                    {attachment.fileName}
                  </a>
                  <span className="task-attachment__size">{formatFileSize(attachment.fileSize)}</span>
                  <ConfirmIconButton
                    icon={<X size={11} weight="bold" />}
                    label={`Delete ${attachment.fileName}`}
                    onConfirm={() => deleteAttachmentMutation.mutate(attachment.id)}
                  />
                </div>
              ))}
            </div>
          )}
          <label className="task-panel__upload-button">
            <Paperclip size={13} weight="bold" />
            {uploadMutation.isPending ? "Uploading…" : "Attach file"}
            <input
              type="file"
              className="task-panel__upload-input"
              onChange={handleFileChange}
              disabled={uploadMutation.isPending}
            />
          </label>
          {uploadMutation.isError && (
            <p className="auth-error" role="alert">
              {uploadMutation.error.message}
            </p>
          )}
        </div>

        <div className="task-panel__row task-panel__row--feed">
          <div className="task-panel__feed-header">
            <span className="task-panel__row-label">Activity</span>
            <button
              type="button"
              className="task-panel__sort-toggle"
              onClick={() => setFeedOrder((order) => (order === "asc" ? "desc" : "asc"))}
            >
              {feedOrder === "asc" ? "Oldest first" : "Newest first"}
            </button>
          </div>
          <div className="task-panel__feed">
            {feedItems.length === 0 && <p className="task-panel__feed-empty">No activity yet.</p>}
            {feedItems.map((item) => (
              <div key={item.id}>{item.node}</div>
            ))}
          </div>
          <form className="task-panel__comment-form" onSubmit={handleCommentSubmit}>
            <textarea
              value={commentBody}
              onChange={(event) => setCommentBody(event.target.value)}
              placeholder="Add a comment…"
              rows={2}
            />
            <button
              type="submit"
              className="auth-form__primary-button"
              disabled={commentMutation.isPending || !commentBody.trim()}
            >
              {commentMutation.isPending ? "Posting…" : "Comment"}
            </button>
          </form>
        </div>
      </div>

      <footer className="task-panel__footer">
        {confirmingDelete ? (
          <div className="task-panel__delete-confirm">
            <span>Delete this task?</span>
            <button
              type="button"
              className="task-panel__delete-yes"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              Delete
            </button>
            <button type="button" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="task-panel__delete-trigger"
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash size={14} weight="bold" />
            Delete task
          </button>
        )}
      </footer>
    </>
  );
}
