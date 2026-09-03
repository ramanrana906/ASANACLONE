import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProfile } from "../../lib/account";
import { ME_QUERY_KEY, useAuth } from "../../hooks/AuthContext";

function toDateInputValue(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

export function ProfileTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pronouns, setPronouns] = useState(user?.pronouns ?? "");
  const [jobTitle, setJobTitle] = useState(user?.jobTitle ?? "");
  const [department, setDepartment] = useState(user?.department ?? "");
  const [aboutMe, setAboutMe] = useState(user?.aboutMe ?? "");
  const [outOfOfficeMessage, setOutOfOfficeMessage] = useState(user?.outOfOfficeMessage ?? "");
  const [outOfOfficeUntil, setOutOfOfficeUntil] = useState(
    toDateInputValue(user?.outOfOfficeUntil ?? null),
  );

  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updated) => queryClient.setQueryData(ME_QUERY_KEY, updated),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({
      pronouns: pronouns || null,
      jobTitle: jobTitle || null,
      department: department || null,
      aboutMe: aboutMe || null,
      outOfOfficeMessage: outOfOfficeMessage || null,
      outOfOfficeUntil: outOfOfficeUntil ? new Date(outOfOfficeUntil).toISOString() : null,
    });
  }

  return (
    <form className="settings-form" onSubmit={handleSubmit}>
      <div className="settings-field-row">
        <label>
          Pronouns
          <input
            type="text"
            value={pronouns}
            onChange={(event) => setPronouns(event.target.value)}
            placeholder="e.g. she/her/hers"
          />
        </label>
        <label>
          Job title
          <input
            type="text"
            value={jobTitle}
            onChange={(event) => setJobTitle(event.target.value)}
          />
        </label>
      </div>
      <label>
        Department or team
        <input
          type="text"
          value={department}
          onChange={(event) => setDepartment(event.target.value)}
        />
      </label>
      <label>
        About me
        <textarea
          value={aboutMe}
          onChange={(event) => setAboutMe(event.target.value)}
          rows={3}
        />
      </label>
      <div className="settings-field-row">
        <label>
          Out of office message
          <input
            type="text"
            value={outOfOfficeMessage}
            onChange={(event) => setOutOfOfficeMessage(event.target.value)}
          />
        </label>
        <label>
          Out of office until
          <input
            type="date"
            value={outOfOfficeUntil}
            onChange={(event) => setOutOfOfficeUntil(event.target.value)}
          />
        </label>
      </div>
      {mutation.isError && (
        <p className="auth-error" role="alert">
          {mutation.error.message}
        </p>
      )}
      {mutation.isSuccess && <p className="settings-saved">Saved.</p>}
      <button type="submit" className="auth-form__primary-button" disabled={mutation.isPending}>
        {mutation.isPending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
