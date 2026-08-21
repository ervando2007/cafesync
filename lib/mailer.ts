import "server-only";
import nodemailer from "nodemailer";

function getTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) return null;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const transport = getTransport();

  if (!transport) {
    // No SMTP configured yet — don't block the feature during development.
    // Never surfaced to the client; requestPasswordReset always returns the
    // same generic message regardless of what happens here.
    console.warn(`[mailer] SMTP not configured. Password reset link for ${to}: ${resetUrl}`);
    return;
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await transport.sendMail({
    from,
    to,
    subject: "Reset your CafeSync password",
    text: `We received a request to reset your CafeSync password.\n\nReset it here (valid for 1 hour):\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `
      <p>We received a request to reset your CafeSync password.</p>
      <p><a href="${resetUrl}">Click here to reset your password</a> (valid for 1 hour).</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}
