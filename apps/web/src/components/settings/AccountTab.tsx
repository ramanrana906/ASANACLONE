import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, Trash } from "@phosphor-icons/react";
import {
  addEmail,
  deactivateAccount,
  deleteAccount,
  deleteEmail,
  listEmails,
  markEmailPreferred,
  revokeOtherSessions,
} from "../../lib/account";
import { ME_QUERY_KEY } from "../../hooks/AuthContext";

const EMAILS_QUERY_KEY = ["account", "emails"];

export function AccountTab() {
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState("");
  const [confirmingDanger, setConfirmingDanger] = useState<"deactivate" | "delete" | null>(null);
  const [sessionsMessage, setSessionsMessage] = useState<string | null>(null);

  const emailsQuery = useQuery({ queryKey: EMAILS_QUERY_KEY, queryFn: listEmails });
  const emails = emailsQuery.data ?? [];

  const addEmailMutation = useMutation({
    mutationFn: addEmail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMAILS_QUERY_KEY });
      setNewEmail("");
    },
  });

  const deleteEmailMutation = useMutation({
    mutationFn: deleteEmail,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EMAILS_QUERY_KEY }),
  });

  const preferredMutation = useMutation({
    mutationFn: markEmailPreferred,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EMAILS_QUERY_KEY }),
  });

  const revokeMutation = useMutation({
    mutationFn: revokeOtherSessions,
    onSuccess: () => setSessionsMessage("Every other session has been logged out."),
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateAccount,
    onSuccess: () => queryClient.setQueryData(ME_QUERY_KEY, null),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => queryClient.setQueryData(ME_QUERY_KEY, null),
  });

  function handleAddEmail(event: FormEvent) {
    event.preventDefault();
    if (!newEmail.trim()) return;
    addEmailMutation.mutate({ email: newEmail.trim() });
  }

  return (
    <div className="settings-form">
      <section className="settings-section">
        <h3>Emails</h3>
        <ul className="settings-email-list">
          {emails.map((email) => (
            <li key={email.id}>
              <span>{email.email}</span>
              {email.isPreferred ? (
                <span className="settings-email-badge">Preferred</span>
              ) : (
                <button
                  type="button"
                  className="settings-icon-button"
                  onClick={() => preferredMutation.mutate(email.id)}
                  aria-label="Mark as preferred notification email"
                >
                  <Star size={16} weight="bold" />
                </button>
              )}
              <button
                type="button"
                className="settings-icon-button"
                onClick={() => deleteEmailMutation.mutate(email.id)}
                aria-label={`Remove ${email.email}`}
              >
                <Trash size={16} weight="bold" />
              </button>
            </li>
          ))}
        </ul>
        <form className="settings-add-email" onSubmit={handleAddEmail}>
          <input
            type="email"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            placeholder="Add another email"
          />
          <button type="submit" disabled={addEmailMutation.isPending || !newEmail.trim()}>
            Add
          </button>
        </form>
      </section>

      <section className="settings-section">
        <h3>Security</h3>
        <p className="auth-form__intro">Log out of all sessions except this current browser.</p>
        <button
          type="button"
          className="auth-form__primary-button"
          onClick={() => revokeMutation.mutate()}
          disabled={revokeMutation.isPending}
        >
          {revokeMutation.isPending ? "Logging out other sessions…" : "Log out other sessions"}
        </button>
        {sessionsMessage && <p className="settings-saved">{sessionsMessage}</p>}
      </section>

      <section className="settings-section settings-section--danger">
        <h3>Deactivation</h3>
        <p className="auth-form__intro">
          Deactivating your account signs you out everywhere. You can't undo this yourself.
        </p>
        {confirmingDanger === "deactivate" ? (
          <div className="settings-danger-confirm">
            <span>Are you sure?</span>
            <button
              type="button"
              className="settings-danger-button"
              onClick={() => deactivateMutation.mutate()}
              disabled={deactivateMutation.isPending}
            >
              {deactivateMutation.isPending ? "Deactivating…" : "Yes, deactivate"}
            </button>
            <button type="button" onClick={() => setConfirmingDanger(null)}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmingDanger("deactivate")}>
            Deactivate account
          </button>
        )}
      </section>

      <section className="settings-section settings-section--danger">
        <h3>Deletion</h3>
        <p className="auth-form__intro">
          Deleting your account is permanent and cannot be undone.
        </p>
        {confirmingDanger === "delete" ? (
          <div className="settings-danger-confirm">
            <span>This can't be undone. Delete your account?</span>
            <button
              type="button"
              className="settings-danger-button"
              onClick={() => deleteAccountMutation.mutate()}
              disabled={deleteAccountMutation.isPending}
            >
              {deleteAccountMutation.isPending ? "Deleting…" : "Yes, delete my account"}
            </button>
            <button type="button" onClick={() => setConfirmingDanger(null)}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmingDanger("delete")}>
            Delete account
          </button>
        )}
      </section>
    </div>
  );
}
