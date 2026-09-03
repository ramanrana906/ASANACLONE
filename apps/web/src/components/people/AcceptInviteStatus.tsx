import { useEffect, useRef, useState } from "react";
import { acceptInvite } from "../../lib/members";

interface AcceptInviteStatusProps {
  token: string;
}

type Status = "pending" | "success" | "error";

export function AcceptInviteStatus({ token }: AcceptInviteStatusProps) {
  const attempted = useRef(false);
  const [status, setStatus] = useState<Status>("pending");
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    acceptInvite(token)
      .then((result) => {
        setWorkspaceName(result.workspaceName);
        setStatus("success");
      })
      .catch((error: Error) => {
        setStatus("error");
        setErrorMessage(error.message);
      });
  }, [token]);

  return (
    <div className="auth-form">
      <h2>
        {status === "pending" && "Joining workspace…"}
        {status === "success" && "You're in"}
        {status === "error" && "Couldn't accept invite"}
      </h2>
      <p className="auth-form__intro" aria-live="polite">
        {status === "pending" && "Hang on a moment."}
        {status === "success" && `You've joined ${workspaceName}.`}
        {status === "error" && errorMessage}
      </p>
      {status !== "pending" && (
        <button
          type="button"
          className="auth-form__primary-button"
          onClick={() => (window.location.href = "/")}
        >
          Go to Clearing
        </button>
      )}
    </div>
  );
}
