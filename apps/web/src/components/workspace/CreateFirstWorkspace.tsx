import { useState, type FormEvent } from "react";
import { useWorkspaces } from "../../hooks/WorkspaceContext";

export function CreateFirstWorkspace() {
  const { createWorkspace, isCreatePending, createError } = useWorkspaces();
  const [name, setName] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await createWorkspace({ name: name.trim() });
    } catch {
      // surfaced via createError
    }
  }

  return (
    <div className="app-main">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Create your workspace</h2>
        <p className="auth-form__intro">
          A workspace holds your projects and teammates. You can create more later.
        </p>
        <label>
          Workspace name
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Acme Inc"
            autoFocus
            required
          />
        </label>
        {createError && (
          <p className="auth-error" role="alert">
            {createError.message}
          </p>
        )}
        <button type="submit" disabled={isCreatePending || !name.trim()}>
          {isCreatePending ? "Creating…" : "Create workspace"}
        </button>
      </form>
    </div>
  );
}
