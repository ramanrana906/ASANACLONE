import { useState } from "react";
import { useAuth } from "../../hooks/AuthContext";

export function VerificationBanner() {
  const { resendVerification, isResendVerificationPending } = useAuth();
  const [sent, setSent] = useState(false);

  async function handleResend() {
    await resendVerification();
    setSent(true);
  }

  return (
    <div className="verification-banner" role="status">
      <p>
        {sent
          ? "Verification email sent — check your inbox."
          : "Verify your email to secure your account."}
      </p>
      {!sent && (
        <button type="button" onClick={handleResend} disabled={isResendVerificationPending}>
          {isResendVerificationPending ? "Sending…" : "Resend email"}
        </button>
      )}
    </div>
  );
}
