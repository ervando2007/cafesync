"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { findUserByEmail } from "@/lib/users";
import { createResetToken } from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/mailer";
import { getT } from "@/lib/i18n/server";
import { sendWhatsAppText } from "@/lib/whatsapp";
import {
  OTP_TTL_MINUTES,
  consumeResetOtp,
  createResetOtp,
  findUserIdByWhatsApp,
} from "@/lib/password-reset-otp";

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

/** Step 1 of the WhatsApp flow: send a 6-digit OTP. Always answers generically. */
export async function requestWhatsAppOtp(whatsappNumber: string): Promise<{ ok: true; message: string }> {
  const { t } = await getT();
  const genericMessage = t("login.otpSentGeneric");

  try {
    const match = await findUserIdByWhatsApp(whatsappNumber);
    if (match) {
      const otp = await createResetOtp(match.userId);
      if (otp) {
        await sendWhatsAppText(
          match.number,
          t("login.otpWhatsAppMessage", { otp, minutes: String(OTP_TTL_MINUTES) }),
        );
      }
    }
  } catch (error) {
    console.error("requestWhatsAppOtp failed", error);
  }

  return { ok: true, message: genericMessage };
}

/** Step 2: verify the OTP and set the new password. */
export async function resetPasswordWithOtp(input: {
  whatsappNumber: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ ok: boolean; message?: string }> {
  const { t } = await getT();

  const otp = input.otp.trim();
  if (!/^\d{6}$/.test(otp)) return { ok: false, message: t("login.errInvalidOtp") };
  if (input.newPassword.length < 6) return { ok: false, message: t("settings.errPasswordMinLength") };
  if (input.newPassword !== input.confirmPassword) {
    return { ok: false, message: t("profile.errPasswordMismatch") };
  }

  try {
    const match = await findUserIdByWhatsApp(input.whatsappNumber);
    if (!match) return { ok: false, message: t("login.errInvalidOtp") };
    const newHash = await bcrypt.hash(input.newPassword, 10);
    const ok = await consumeResetOtp(match.userId, otp, newHash);
    return ok ? { ok: true } : { ok: false, message: t("login.errInvalidOtp") };
  } catch (error) {
    console.error("resetPasswordWithOtp failed", error);
    return { ok: false, message: t("common.somethingWentWrong") };
  }
}
