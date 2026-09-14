import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT) || 465;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

const RESEND_API_KEY = process.env.RESEND_API_KEY;

const MAIL_FROM = process.env.MAIL_FROM || SMTP_USER || "Clearing <onboarding@resend.dev>";

const smtpTransport = SMTP_USER && SMTP_PASS
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null;

async function sendViaSmtp(to: string, subject: string, html: string): Promise<boolean> {
  if (!smtpTransport) return false;
  try {
    await smtpTransport.sendMail({ from: MAIL_FROM, to, subject, html });
    return true;
  } catch (error) {
    console.warn(`[mailer] SMTP send to ${to} failed:`, error);
    return false;
  }
}

async function sendViaResend(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: MAIL_FROM, to, subject, html }),
    });
    if (!res.ok) {
      console.warn(`[mailer] Resend send to ${to} failed: ${res.status} ${await res.text()}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn(`[mailer] Resend send to ${to} failed:`, error);
    return false;
  }
}

// Sending email is always best-effort: a provider failure must never take
// down the flow that triggered it (signup, password reset, invites — all of
// these have already committed the state that matters before this runs).
// Tries SMTP first (e.g. Gmail with an app password — delivers to anyone),
// then Resend, then falls back to logging so links are still testable.
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (await sendViaSmtp(to, subject, html)) return;
  if (await sendViaResend(to, subject, html)) return;

  console.log(
    `[mailer] No mail provider configured/available — logging email instead of sending.\n` +
      `  to: ${to}\n  subject: ${subject}\n  body: ${html}`,
  );
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

export function sendWorkspaceInviteEmail(
  to: string,
  inviterName: string,
  workspaceName: string,
  acceptUrl: string,
): Promise<void> {
  return sendEmail(
    to,
    `${inviterName} invited you to ${workspaceName} on Clearing`,
    `<p>${inviterName} invited you to join <strong>${workspaceName}</strong> on Clearing.</p>` +
      `<p><a href="${acceptUrl}">Accept the invite</a></p>`,
  );
}
