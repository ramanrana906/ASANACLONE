const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MAIL_FROM = process.env.MAIL_FROM || "Clearing <onboarding@resend.dev>";

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.log(
      `[mailer] RESEND_API_KEY not set — logging email instead of sending.\n` +
        `  to: ${to}\n  subject: ${subject}\n  body: ${html}`,
    );
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: MAIL_FROM, to, subject, html }),
  });

  if (!res.ok) {
    throw new Error(`Failed to send email: ${res.status} ${await res.text()}`);
  }
}

export function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  return sendEmail(
    to,
    "Reset your Clearing password",
    `<p>We got a request to reset your Clearing password.</p>` +
      `<p><a href="${resetUrl}">Reset your password</a></p>` +
      `<p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>`,
  );
}

export function sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
  return sendEmail(
    to,
    "Verify your Clearing email",
    `<p>Confirm your email address to finish setting up your Clearing account.</p>` +
      `<p><a href="${verifyUrl}">Verify your email</a></p>`,
  );
}
