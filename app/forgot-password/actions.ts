"use server";

import { headers } from "next/headers";
import { findUserByEmail } from "@/lib/users";
import { createResetToken } from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/mailer";
import { getT } from "@/lib/i18n/server";

async function getBaseUrl(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const proto =
    headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function requestPasswordReset(email: string): Promise<{ ok: true; message: string }> {
  const { t } = await getT();
  const genericMessage = t("login.resetLinkSentGeneric");

  const trimmedEmail = email.trim();
  if (!trimmedEmail) return { ok: true, message: genericMessage };

  try {
    const user = await findUserByEmail(trimmedEmail);
    if (user && user.password_hash && user.status === "ACTIVE") {
      const rawToken = await createResetToken(user.id);
      const baseUrl = await getBaseUrl();
      const resetUrl = `${baseUrl}/reset-password/${rawToken}`;
      await sendPasswordResetEmail(user.email, resetUrl);
    }
  } catch (error) {
    // Never surfaced to the client — the response must stay generic either way.
    console.error("requestPasswordReset failed", error);
  }

  return { ok: true, message: genericMessage };
}
