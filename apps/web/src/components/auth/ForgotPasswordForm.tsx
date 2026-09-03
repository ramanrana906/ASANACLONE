import { useState, type FormEvent } from "react";
import { useAuth } from "../../hooks/AuthContext";

interface ForgotPasswordFormProps {
  onSwitchToLogin: () => void;
}

export function ForgotPasswordForm({ onSwitchToLogin }: ForgotPasswordFormProps) {
  const { forgotPassword, isForgotPasswordPending, forgotPasswordError } = useAuth();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await forgotPassword({ email });
      setSubmitted(true);
    } catch {
      // surfaced via forgotPasswordError
    }
  }

  if (submitted) {
    return (
      <div className="auth-form">
        <h2>Check your email</h2>
        <p className="auth-form__intro">
          If an account exists for <strong>{email}</strong>, we've sent a link to reset your
          password. It expires in 1 hour.
        </p>
        <button type="button" className="auth-form__primary-button" onClick={onSwitchToLogin}>
          Back to log in
        </button>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Reset your password</h2>
      <p className="auth-form__intro">
        Enter your email and we'll send you a link to reset your password.
      </p>
      <label>
        Email
        <input
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          spellCheck={false}
          required
        />
      </label>
      {forgotPasswordError && (
        <p className="auth-error" role="alert">
          {forgotPasswordError.message}
        </p>
      )}
      <button type="submit" disabled={isForgotPasswordPending}>
        {isForgotPasswordPending ? "Sending…" : "Send reset link"}
      </button>
      <p className="auth-switch">
        <button type="button" onClick={onSwitchToLogin}>
          Back to log in
        </button>
      </p>
    </form>
  );
}
