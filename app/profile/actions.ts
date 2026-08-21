"use server";

import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import { requireSession } from "@/lib/auth-guard";
import pool from "@/lib/db";
import { getT } from "@/lib/i18n/server";

const AVATAR_DIR = path.join(process.cwd(), "public", "uploads", "avatars");
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export interface ActionResult {
  ok: boolean;
  message?: string;
}

function isDuplicateEmailError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ER_DUP_ENTRY"
  );
}

export async function updateProfile(input: {
  name: string;
  email: string;
  whatsappNumber: string;
  address: string;
}): Promise<ActionResult> {
  const session = await requireSession();
  const { t } = await getT();
  const name = input.name.trim();
  const email = input.email.trim();
  const whatsappNumber = input.whatsappNumber.trim();
  const address = input.address.trim();
  if (!name) return { ok: false, message: t("inventory.errNameRequired") };
  if (!email || !email.includes("@")) return { ok: false, message: t("settings.errValidEmailRequired") };

  try {
    const [result] = await pool.query(
      "UPDATE users SET name = ?, email = ?, whatsapp_number = ?, address = ? WHERE id = ?",
      [name, email, whatsappNumber || null, address || null, Number(session.user.id)],
    );
    if ((result as { affectedRows: number }).affectedRows === 0) {
      return { ok: false, message: t("settings.errUserNotFound") };
    }
    return { ok: true };
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      return { ok: false, message: t("profile.errEmailInUse") };
    }
    console.error("updateProfile failed", error);
    return { ok: false, message: t("profile.errCouldNotSaveProfile") };
  }
}

async function getCurrentAvatarUrl(userId: number): Promise<string | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT avatar_url AS avatarUrl FROM users WHERE id = ?",
    [userId],
  );
  return (rows[0]?.avatarUrl as string | undefined) ?? null;
}

async function deleteAvatarFile(avatarUrl: string): Promise<void> {
  if (!avatarUrl.startsWith("/uploads/avatars/")) return;
  const filePath = path.join(process.cwd(), "public", avatarUrl);
  await unlink(filePath).catch(() => {});
}

export async function uploadProfilePhoto(formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const { t } = await getT();
  const userId = Number(session.user.id);

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: t("masterData.errChooseImageFile") };
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { ok: false, message: t("masterData.errImageTypeNotAllowed") };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, message: t("masterData.errImageTooLarge") };
  }

  try {
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const filename = `${userId}-${randomUUID()}.${extension}`;

    await mkdir(AVATAR_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(AVATAR_DIR, filename), buffer);

    const avatarUrl = `/uploads/avatars/${filename}`;
    const previousAvatarUrl = await getCurrentAvatarUrl(userId);

    await pool.query("UPDATE users SET avatar_url = ? WHERE id = ?", [avatarUrl, userId]);
    if (previousAvatarUrl) await deleteAvatarFile(previousAvatarUrl);

    return { ok: true };
  } catch (error) {
    console.error("uploadProfilePhoto failed", error);
    return { ok: false, message: t("profile.errCouldNotUploadPhoto") };
  }
}

export async function removeProfilePhoto(): Promise<ActionResult> {
  const session = await requireSession();
  const { t } = await getT();
  const userId = Number(session.user.id);

  try {
    const previousAvatarUrl = await getCurrentAvatarUrl(userId);
    await pool.query("UPDATE users SET avatar_url = NULL WHERE id = ?", [userId]);
    if (previousAvatarUrl) await deleteAvatarFile(previousAvatarUrl);
    return { ok: true };
  } catch (error) {
    console.error("removeProfilePhoto failed", error);
    return { ok: false, message: t("profile.errCouldNotRemovePhoto") };
  }
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ActionResult> {
  const session = await requireSession();
  const { t } = await getT();
  const userId = Number(session.user.id);

  if (input.newPassword.length < 6) {
    return { ok: false, message: t("settings.errPasswordMinLength") };
  }
  if (input.newPassword !== input.confirmPassword) {
    return { ok: false, message: t("profile.errPasswordMismatch") };
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT password_hash AS passwordHash FROM users WHERE id = ?",
    [userId],
  );
  const currentHash = rows[0]?.passwordHash as string | null | undefined;
  if (!currentHash) {
    return { ok: false, message: t("profile.errNoPasswordSet") };
  }

  const matches = await bcrypt.compare(input.currentPassword, currentHash);
  if (!matches) {
    return { ok: false, message: t("profile.errCurrentPasswordIncorrect") };
  }

  try {
    const newHash = await bcrypt.hash(input.newPassword, 10);
    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, userId]);
    return { ok: true };
  } catch (error) {
    console.error("changePassword failed", error);
    return { ok: false, message: t("profile.errCouldNotChangePassword") };
  }
}
