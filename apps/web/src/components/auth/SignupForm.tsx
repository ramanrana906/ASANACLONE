import { useEffect, useRef, useState, type FormEvent } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import { useAuth } from "../../hooks/AuthContext";
import { GoogleButton } from "./GoogleButton";

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

export function SignupForm({ onSwitchToLogin }: SignupFormProps) {
  const { signup, isSignupPending, signupError } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (signupError) {
      errorRef.current?.focus();
    }
  }, [signupError]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await signup({ name, email, password });
    } catch {
      // surfaced via signupError
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Create your account</h2>
      <GoogleButton />
      <div className="auth-form__divider">
        <span>or</span>
      </div>
      <label>
        Name
        <input
          type="text"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
          required
        />
      </label>
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
        Password
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
      {signupError && (
        <p className="auth-error" role="alert" tabIndex={-1} ref={errorRef}>
          {signupError.message}
        </p>
      )}
      <button type="submit" disabled={isSignupPending}>
        {isSignupPending ? "Creating account…" : "Create account"}
      </button>
      <p className="auth-switch">
        Already have an account?{" "}
        <button type="button" onClick={onSwitchToLogin}>
          Log in
        </button>
      </p>
    </form>
  );
}
