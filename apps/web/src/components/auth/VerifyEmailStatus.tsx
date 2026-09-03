import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../hooks/AuthContext";

interface VerifyEmailStatusProps {
  token: string;
}

type Status = "pending" | "success" | "error";

export function VerifyEmailStatus({ token }: VerifyEmailStatusProps) {
  const { verifyEmail } = useAuth();
  const attempted = useRef(false);
  const [status, setStatus] = useState<Status>("pending");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    verifyEmail({ token })
      .then(() => setStatus("success"))
      .catch((error: Error) => {
        setStatus("error");
        setErrorMessage(error.message);
      });
  }, [token, verifyEmail]);

  return (
    <div className="auth-form">
      <h2>
        {status === "pending" && "Verifying your email…"}
        {status === "success" && "Email verified"}
        {status === "error" && "Verification failed"}
      </h2>
      <p className="auth-form__intro" aria-live="polite">
        {status === "pending" && "Hang on a moment."}
        {status === "success" && "Your email is confirmed. You're all set."}
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
