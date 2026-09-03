import { useEffect, useRef, useState, type FormEvent } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import { useAuth } from "../../hooks/AuthContext";

interface ResetPasswordFormProps {
  token: string;
  onSwitchToLogin: () => void;
}

export function ResetPasswordForm({ token, onSwitchToLogin }: ResetPasswordFormProps) {
  const { resetPassword, isResetPasswordPending, resetPasswordError } = useAuth();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (resetPasswordError) {
      errorRef.current?.focus();
    }
  }, [resetPasswordError]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await resetPassword({ token, password });
      setDone(true);
    } catch {
      // surfaced via resetPasswordError
    }
  }

  if (done) {
    return (
      <div className="auth-form">
        <h2>Password updated</h2>
        <p className="auth-form__intro">Your password has been reset. You can log in now.</p>
        <button type="button" className="auth-form__primary-button" onClick={onSwitchToLogin}>
          Go to log in
        </button>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Choose a new password</h2>
      <label>
        New password
        <span className="auth-form__password-field">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
          <button
            type="button"
            className="auth-form__reveal"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeSlash size={18} weight="bold" />
            ) : (
              <Eye size={18} weight="bold" />
            )}
          </button>
        </span>
      </label>
      {resetPasswordError && (
        <p className="auth-error" role="alert" tabIndex={-1} ref={errorRef}>
          {resetPasswordError.message}
        </p>
      )}
      <button type="submit" disabled={isResetPasswordPending}>
        {isResetPasswordPending ? "Saving…" : "Save new password"}
      </button>
      <p className="auth-switch">
        <button type="button" onClick={onSwitchToLogin}>
          Back to log in
        </button>
      </p>
    </form>
  );
}
