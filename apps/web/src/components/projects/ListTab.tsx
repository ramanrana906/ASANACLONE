import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CaretDown, CaretRight, Diamond } from "@phosphor-icons/react";
import type { CustomField, CustomFieldValueData, TaskCard as TaskCardType } from "@asanaClone/shared";
import { listSections } from "../../lib/sections";
import { listProjectTasks } from "../../lib/tasks";
import { listCustomFields } from "../../lib/customFields";
import { Avatar } from "../common/Avatar";
import { TaskDetailPanel } from "../tasks/TaskDetailPanel";

type SortField = "title" | "assignee" | "dueDate";

interface ListTabProps {
  projectId: number;
  workspaceId: number;
}

function formatDueRange(start: string | null, end: string | null): string {
  if (!start && !end) return "—";
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (start && end && start.slice(0, 10) !== end.slice(0, 10)) {
    return `${fmt(start)} – ${fmt(end)}`;
  }
  return fmt(start ?? (end as string));
}

function formatFieldValue(value: CustomFieldValueData | undefined): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) return value.join(", ") || "—";
  return String(value);
}

export function ListTab({ projectId, workspaceId }: ListTabProps) {
  const [sortField, setSortField] = useState<SortField>("title");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);

  const sectionsQuery = useQuery({
    queryKey: ["projects", projectId, "sections"],
    queryFn: () => listSections(projectId),
  });
  const tasksQuery = useQuery({
    queryKey: ["projects", projectId, "tasks"],
    queryFn: () => listProjectTasks(projectId),
  });
  const fieldsQuery = useQuery({
    queryKey: ["projects", projectId, "custom-fields"],
    queryFn: () => listCustomFields(projectId),
  });

  const sections = sectionsQuery.data ?? [];
  const fields: CustomField[] = fieldsQuery.data ?? [];

  const grouped = useMemo(() => {
    const map = new Map<number, TaskCardType[]>();
    for (const task of tasksQuery.data ?? []) {
      const list = map.get(task.sectionId) ?? [];
      list.push(task);
      map.set(task.sectionId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        let diff = 0;
        if (sortField === "title") diff = a.title.localeCompare(b.title);
        else if (sortField === "assignee") {
          diff = (a.assignee?.name ?? "").localeCompare(b.assignee?.name ?? "");
        } else if (sortField === "dueDate") {
          diff = (a.dueDateStart ?? "").localeCompare(b.dueDateStart ?? "");
        }
        return sortDir === "asc" ? diff : -diff;
      });
    }
    return map;
  }, [tasksQuery.data, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function toggleCollapsed(sectionId: number) {
    setCollapsedSections((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  const gridTemplateColumns =
    fields.length > 0
      ? `minmax(220px, 2fr) 160px 140px repeat(${fields.length}, 130px)`
      : "minmax(220px, 2fr) 160px 140px";

  if (sectionsQuery.isLoading || tasksQuery.isLoading) {
    return <p aria-live="polite">Loading…</p>;
  }

  return (
    <div className="list-tab">
      <div className="list-tab__header-row" style={{ gridTemplateColumns }}>
        <button
          type="button"
          className="list-tab__col list-tab__col--name"
          onClick={() => toggleSort("title")}
        >
          Name {sortField === "title" && (sortDir === "asc" ? "↑" : "↓")}
        </button>
        <button type="button" className="list-tab__col" onClick={() => toggleSort("assignee")}>
          Assignee {sortField === "assignee" && (sortDir === "asc" ? "↑" : "↓")}
        </button>
        <button type="button" className="list-tab__col" onClick={() => toggleSort("dueDate")}>
          Due date {sortField === "dueDate" && (sortDir === "asc" ? "↑" : "↓")}
        </button>
        {fields.map((field) => (
          <span key={field.id} className="list-tab__col">
            {field.name}
          </span>
        ))}
      </div>

      {sections.map((section) => {
        const rows = grouped.get(section.id) ?? [];
        const isCollapsed = collapsedSections.has(section.id);
        return (
          <div className="list-tab__group" key={section.id}>
            <button
              type="button"
              className="list-tab__group-header"
              onClick={() => toggleCollapsed(section.id)}
            >
              {isCollapsed ? <CaretRight size={13} weight="bold" /> : <CaretDown size={13} weight="bold" />}
              {section.name}
              <span className="list-tab__group-count">{rows.length}</span>
            </button>
            {!isCollapsed &&
              rows.map((task) => (
                <button
                  type="button"
                  className="list-tab__row"
                  style={{ gridTemplateColumns }}
                  key={task.id}
                  onClick={() => setOpenTaskId(task.id)}
                >
                  <span className="list-tab__col list-tab__col--name">
                    {task.isMilestone && (
                      <Diamond size={11} weight="fill" className="list-tab__milestone" />
                    )}
                    <span className={task.completed ? "is-done" : ""}>{task.title}</span>
                  </span>
                  <span className="list-tab__col">
                    {task.assignee ? (
                      <span className="list-tab__assignee">
                        <Avatar name={task.assignee.name} userKey={task.assignee.id} size={18} />
                        {task.assignee.name}
                      </span>
                    ) : (
                      "—"
                    )}
                  </span>
                  <span className="list-tab__col">
                    {formatDueRange(task.dueDateStart, task.dueDateEnd)}
                  </span>
                  {fields.map((field) => {
                    const entry = task.customFieldValues.find(
                      (value) => value.customFieldId === field.id,
                    );
                    return (
                      <span key={field.id} className="list-tab__col">
                        {formatFieldValue(entry?.value)}
                      </span>
                    );
                  })}
                </button>
              ))}
            {!isCollapsed && rows.length === 0 && (
              <p className="list-tab__empty">No tasks in this section.</p>
            )}
          </div>
        );
      })}

      {openTaskId !== null && (
        <TaskDetailPanel
          taskId={openTaskId}
          workspaceId={workspaceId}
          onClose={() => setOpenTaskId(null)}
        />
      )}
    </div>
  );
}
