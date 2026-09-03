import { useEffect, useRef, useState, type FormEvent } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import { useAuth } from "../../hooks/AuthContext";
import { GoogleButton } from "./GoogleButton";

interface LoginFormProps {
  onSwitchToSignup: () => void;
  onSwitchToForgotPassword: () => void;
}

export function LoginForm({ onSwitchToSignup, onSwitchToForgotPassword }: LoginFormProps) {
  const { login, isLoginPending, loginError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (loginError) {
      errorRef.current?.focus();
    }
  }, [loginError]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await login({ email, password });
    } catch {
      // surfaced via loginError
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Log in</h2>
      <GoogleButton />
      <div className="auth-form__divider">
        <span>or</span>
      </div>
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
      <label>
        <span className="auth-form__label-row">
          Password
          <button type="button" className="auth-form__link" onClick={onSwitchToForgotPassword}>
            Forgot password?
          </button>
        </span>
        <span className="auth-form__password-field">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
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
      {loginError && (
        <p className="auth-error" role="alert" tabIndex={-1} ref={errorRef}>
          {loginError.message}
        </p>
      )}
      <button type="submit" disabled={isLoginPending}>
        {isLoginPending ? "Logging in…" : "Log in"}
      </button>
      <p className="auth-switch">
        Don’t have an account?{" "}
        <button type="button" onClick={onSwitchToSignup}>
          Create one
        </button>
      </p>
    </form>
  );
}
