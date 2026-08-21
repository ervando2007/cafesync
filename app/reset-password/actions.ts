"use server";

import bcrypt from "bcryptjs";
import { findValidResetToken, consumeResetToken } from "@/lib/password-reset";
import { getT } from "@/lib/i18n/server";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

export async function resetPassword(input: {
  token: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ActionResult> {
  const { t } = await getT();

  if (input.newPassword.length < 6) {
    return { ok: false, message: t("settings.errPasswordMinLength") };
  }
  if (input.newPassword !== input.confirmPassword) {
    return { ok: false, message: t("profile.errPasswordMismatch") };
  }

  const valid = await findValidResetToken(input.token);
  if (!valid) {
    return { ok: false, message: t("login.errInvalidOrExpiredToken") };
  }

  try {
    const newHash = await bcrypt.hash(input.newPassword, 10);
    await consumeResetToken(valid.id, valid.userId, newHash);
    return { ok: true };
  } catch (error) {
    console.error("resetPassword failed", error);
    return { ok: false, message: t("common.somethingWentWrong") };
  }
}
