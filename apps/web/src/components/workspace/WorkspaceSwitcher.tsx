import { useEffect, useRef, useState, type FormEvent } from "react";
import { CaretUpDown, Check, Plus } from "@phosphor-icons/react";
import { useWorkspaces } from "../../hooks/WorkspaceContext";
import { colorForKey } from "../../lib/identity";

interface WorkspaceSwitcherProps {
  collapsed?: boolean;
}

export function WorkspaceSwitcher({ collapsed = false }: WorkspaceSwitcherProps) {
  const { workspaces, currentWorkspace, switchWorkspace, createWorkspace, isCreatePending } =
    useWorkspaces();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!newName.trim()) return;
    await createWorkspace({ name: newName.trim() });
    setNewName("");
    setCreating(false);
    setOpen(false);
  }

  return (
    <div className="workspace-switcher" ref={rootRef}>
      <button
        type="button"
        className={
          collapsed ? "workspace-switcher__trigger workspace-switcher__trigger--collapsed" : "workspace-switcher__trigger"
        }
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title={collapsed ? (currentWorkspace?.name ?? "Select workspace") : undefined}
      >
        {currentWorkspace && (
          <span
            className="workspace-switcher__icon"
            style={{ background: colorForKey(currentWorkspace.id) }}
          >
            {currentWorkspace.name.charAt(0).toUpperCase()}
          </span>
        )}
        {!collapsed && (
          <>
            <span className="workspace-switcher__name">
              {currentWorkspace?.name ?? "Select workspace"}
            </span>
            <CaretUpDown size={14} weight="bold" />
          </>
        )}
      </button>

      {open && (
        <div className="workspace-switcher__menu" role="menu">
          {workspaces.map((workspace) => (
            <button
              type="button"
              key={workspace.id}
              className="workspace-switcher__item"
              onClick={() => {
                switchWorkspace(workspace.id);
                setOpen(false);
              }}
            >
              <span
                className="workspace-switcher__icon workspace-switcher__icon--sm"
                style={{ background: colorForKey(workspace.id) }}
              >
                {workspace.name.charAt(0).toUpperCase()}
              </span>
              <span className="workspace-switcher__item-name">{workspace.name}</span>
              {workspace.id === currentWorkspace?.id && <Check size={14} weight="bold" />}
            </button>
          ))}

          <div className="workspace-switcher__divider" />

          {creating ? (
            <form className="workspace-switcher__create-form" onSubmit={handleCreate}>
              <input
                type="text"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="Workspace name"
                autoFocus
              />
              <button type="submit" disabled={isCreatePending || !newName.trim()}>
                {isCreatePending ? "Creating…" : "Create"}
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="workspace-switcher__item workspace-switcher__item--action"
              onClick={() => setCreating(true)}
            >
              <Plus size={14} weight="bold" />
              <span>Create workspace</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
