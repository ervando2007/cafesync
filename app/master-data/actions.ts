"use server";

import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import type { RowDataPacket } from "mysql2";
import { hasOutletAccess, requireRole } from "@/lib/auth-guard";
import pool from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import type { TranslateFn } from "@/lib/i18n/translate";
import type { AccountType } from "@/lib/accounting";
import { openingIneligibleReason } from "@/lib/opening-balances";
import { getOutletPricesForProduct, type OutletPriceRow } from "@/lib/products";

const PRODUCT_IMAGE_DIR = path.join(process.cwd(), "public", "uploads", "products");
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const ALLOWED_ROLES = ["ADMIN", "GM"];
const COA_ROLES = ["ADMIN", "ACCOUNTING"];
const ACCOUNT_TYPES: AccountType[] = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];

export interface ActionResult {
  ok: boolean;
  message?: string;
}

interface OutletInput {
  code: string;
  name: string;
  address: string;
  timezone: string;
}

function validateOutletInput(input: OutletInput, t: TranslateFn): string | null {
  if (!input.code.trim()) return t("masterData.errOutletCodeRequired");
  if (!input.name.trim()) return t("masterData.errOutletNameRequired");
  if (!input.timezone.trim()) return t("masterData.errTimezoneRequired");
  return null;
}

function isDuplicateCodeError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ER_DUP_ENTRY"
  );
}

export async function createOutlet(input: OutletInput): Promise<ActionResult> {
  await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  const validationError = validateOutletInput(input, t);
  if (validationError) return { ok: false, message: validationError };

  try {
    await pool.query(
      `INSERT INTO outlets (code, name, address, timezone, status)
       VALUES (?, ?, ?, ?, 'ACTIVE')`,
      [input.code.trim(), input.name.trim(), input.address.trim() || null, input.timezone.trim()],
    );
    return { ok: true };
  } catch (error) {
    if (isDuplicateCodeError(error)) {
      return { ok: false, message: t("masterData.errOutletCodeExists") };
    }
    console.error("createOutlet failed", error);
    return { ok: false, message: t("masterData.errCouldNotSaveOutlet") };
  }
}

export async function updateOutlet(input: OutletInput & { id: number }): Promise<ActionResult> {
  await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  const validationError = validateOutletInput(input, t);
  if (validationError) return { ok: false, message: validationError };

  try {
    const [result] = await pool.query(
      `UPDATE outlets SET code = ?, name = ?, address = ?, timezone = ? WHERE id = ?`,
      [
        input.code.trim(),
        input.name.trim(),
        input.address.trim() || null,
        input.timezone.trim(),
        input.id,
      ],
    );
    if ((result as { affectedRows: number }).affectedRows === 0) {
      return { ok: false, message: t("masterData.errOutletNotFound") };
    }
    return { ok: true };
  } catch (error) {
    if (isDuplicateCodeError(error)) {
      return { ok: false, message: t("masterData.errOutletCodeExists") };
    }
    console.error("updateOutlet failed", error);
    return { ok: false, message: t("masterData.errCouldNotSaveOutlet") };
  }
}

export async function setOutletStatus(input: {
  id: number;
  status: "ACTIVE" | "INACTIVE";
}): Promise<ActionResult> {
  await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  if (input.status !== "ACTIVE" && input.status !== "INACTIVE") {
    return { ok: false, message: t("inventory.errInvalidStatus") };
  }

  try {
    const [result] = await pool.query("UPDATE outlets SET status = ? WHERE id = ?", [
      input.status,
      input.id,
    ]);
    if ((result as { affectedRows: number }).affectedRows === 0) {
      return { ok: false, message: t("masterData.errOutletNotFound") };
    }
    return { ok: true };
  } catch (error) {
    console.error("setOutletStatus failed", error);
    return { ok: false, message: t("masterData.errCouldNotUpdateOutletStatus") };
  }
}

// ── Products ─────────────────────────────────────────────────────────────

const PRODUCT_TYPES = ["FOOD", "BEVERAGE", "MERCHANDISE", "SERVICE"];

interface ProductInput {
  sku: string;
  name: string;
  description: string;
  categoryId: number | null;
  productType: string;
  baseUnitId: number | null;
}

function validateProductInput(input: ProductInput, t: TranslateFn): string | null {
  if (!input.sku.trim()) return t("inventory.errSkuRequired");
  if (!input.name.trim()) return t("inventory.errNameRequired");
  if (!PRODUCT_TYPES.includes(input.productType)) return t("masterData.errInvalidProductType");
  return null;
}

export async function createProduct(input: ProductInput): Promise<ActionResult> {
  await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  const validationError = validateProductInput(input, t);
  if (validationError) return { ok: false, message: validationError };

  try {
    await pool.query(
      `INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [
        input.sku.trim(),
        input.name.trim(),
        input.description.trim() || null,
        input.categoryId,
        input.productType,
        input.baseUnitId,
      ],
    );
    return { ok: true };
  } catch (error) {
    if (isDuplicateCodeError(error)) {
      return { ok: false, message: t("masterData.errProductSkuExists") };
    }
    console.error("createProduct failed", error);
    return { ok: false, message: t("masterData.errCouldNotSaveProduct") };
  }
}

export async function updateProduct(input: ProductInput & { id: number }): Promise<ActionResult> {
  await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  const validationError = validateProductInput(input, t);
  if (validationError) return { ok: false, message: validationError };

  try {
    const [result] = await pool.query(
      `UPDATE products SET sku = ?, name = ?, description = ?, category_id = ?,
         product_type = ?, base_unit_id = ? WHERE id = ?`,
      [
        input.sku.trim(),
        input.name.trim(),
        input.description.trim() || null,
        input.categoryId,
        input.productType,
        input.baseUnitId,
        input.id,
      ],
    );
    if ((result as { affectedRows: number }).affectedRows === 0) {
      return { ok: false, message: t("masterData.errProductNotFound") };
    }
    return { ok: true };
  } catch (error) {
    if (isDuplicateCodeError(error)) {
      return { ok: false, message: t("masterData.errProductSkuExists") };
    }
    console.error("updateProduct failed", error);
    return { ok: false, message: t("masterData.errCouldNotSaveProduct") };
  }
}

export async function setProductStatus(input: {
  id: number;
  status: "ACTIVE" | "INACTIVE";
}): Promise<ActionResult> {
  await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  if (input.status !== "ACTIVE" && input.status !== "INACTIVE") {
    return { ok: false, message: t("inventory.errInvalidStatus") };
  }

  try {
    const [result] = await pool.query("UPDATE products SET status = ? WHERE id = ?", [
      input.status,
      input.id,
    ]);
    if ((result as { affectedRows: number }).affectedRows === 0) {
      return { ok: false, message: t("masterData.errProductNotFound") };
    }
    return { ok: true };
  } catch (error) {
    console.error("setProductStatus failed", error);
    return { ok: false, message: t("masterData.errCouldNotUpdateProductStatus") };
  }
}

// ── Outlet Pricing ───────────────────────────────────────────────────────

export async function getOutletPricesForProductChannel(
  productId: number,
  channel: string,
): Promise<OutletPriceRow[]> {
  await requireRole(ALLOWED_ROLES);
  return getOutletPricesForProduct(productId, channel);
}

export async function upsertOutletProduct(input: {
  outletId: number;
  productId: number;
  channel: string;
  sellingPrice: number;
  taxRate: number;
  isAvailable: boolean;
}): Promise<ActionResult> {
  await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  if (!Number.isFinite(input.sellingPrice) || input.sellingPrice < 0) {
    return { ok: false, message: t("masterData.errSellingPriceNegative") };
  }
  if (!Number.isFinite(input.taxRate) || input.taxRate < 0) {
    return { ok: false, message: t("masterData.errTaxRateNegative") };
  }

  try {
    await pool.query(
      `INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE selling_price = VALUES(selling_price),
         tax_rate = VALUES(tax_rate), is_available = VALUES(is_available)`,
      [
        input.outletId,
        input.productId,
        input.channel,
        input.sellingPrice,
        input.taxRate,
        input.isAvailable ? 1 : 0,
      ],
    );
    return { ok: true };
  } catch (error) {
    console.error("upsertOutletProduct failed", error);
    return { ok: false, message: t("masterData.errCouldNotSaveOutletPricing") };
  }
}

export async function removeOutletProduct(input: {
  outletId: number;
  productId: number;
  channel: string;
}): Promise<ActionResult> {
  await requireRole(ALLOWED_ROLES);
  const { t } = await getT();

  try {
    await pool.query(
      "DELETE FROM outlet_products WHERE outlet_id = ? AND product_id = ? AND channel = ?",
      [input.outletId, input.productId, input.channel],
    );
    return { ok: true };
  } catch (error) {
    console.error("removeOutletProduct failed", error);
    return { ok: false, message: t("masterData.errCouldNotRemoveOutletPricing") };
  }
}

// ── Product Categories ──────────────────────────────────────────────────

export async function createProductCategory(input: { name: string }): Promise<ActionResult> {
  await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  const name = input.name.trim();
  if (!name) return { ok: false, message: t("inventory.errCategoryNameRequired") };

  try {
    await pool.query("INSERT INTO categories (name, status) VALUES (?, 'ACTIVE')", [name]);
    return { ok: true };
  } catch (error) {
    if (isDuplicateCodeError(error)) {
      return { ok: false, message: t("inventory.errCategoryExists") };
    }
    console.error("createProductCategory failed", error);
    return { ok: false, message: t("inventory.errCouldNotSaveCategory") };
  }
}

export async function updateProductCategory(input: {
  id: number;
  name: string;
}): Promise<ActionResult> {
  await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  const name = input.name.trim();
  if (!name) return { ok: false, message: t("inventory.errCategoryNameRequired") };

  try {
    const [result] = await pool.query("UPDATE categories SET name = ? WHERE id = ?", [
      name,
      input.id,
    ]);
    if ((result as { affectedRows: number }).affectedRows === 0) {
      return { ok: false, message: t("inventory.errCategoryNotFound") };
    }
    return { ok: true };
  } catch (error) {
    if (isDuplicateCodeError(error)) {
      return { ok: false, message: t("inventory.errCategoryExists") };
    }
    console.error("updateProductCategory failed", error);
    return { ok: false, message: t("inventory.errCouldNotSaveCategory") };
  }
}

export async function setProductCategoryStatus(input: {
  id: number;
  status: "ACTIVE" | "INACTIVE";
}): Promise<ActionResult> {
  await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  if (input.status !== "ACTIVE" && input.status !== "INACTIVE") {
    return { ok: false, message: t("inventory.errInvalidStatus") };
  }

  try {
    const [result] = await pool.query("UPDATE categories SET status = ? WHERE id = ?", [
      input.status,
      input.id,
    ]);
    if ((result as { affectedRows: number }).affectedRows === 0) {
      return { ok: false, message: t("inventory.errCategoryNotFound") };
    }
    return { ok: true };
  } catch (error) {
    console.error("setProductCategoryStatus failed", error);
    return { ok: false, message: t("inventory.errCouldNotUpdateCategoryStatus") };
  }
}

// ── Product Image ────────────────────────────────────────────────────────

async function getCurrentImageUrl(productId: number): Promise<string | null> {
  const [rows] = await pool.query("SELECT image_url AS imageUrl FROM products WHERE id = ?", [
    productId,
  ]);
  const row = (rows as { imageUrl: string | null }[])[0];
  return row?.imageUrl ?? null;
}

async function deleteImageFile(imageUrl: string): Promise<void> {
  if (!imageUrl.startsWith("/uploads/products/")) return;
  const filePath = path.join(process.cwd(), "public", imageUrl);
  await unlink(filePath).catch(() => {});
}

export async function uploadProductImage(
  productId: number,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(ALLOWED_ROLES);
  const { t } = await getT();

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
    const filename = `${productId}-${randomUUID()}.${extension}`;

    await mkdir(PRODUCT_IMAGE_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(PRODUCT_IMAGE_DIR, filename), buffer);

    const imageUrl = `/uploads/products/${filename}`;
    const previousImageUrl = await getCurrentImageUrl(productId);

    const [result] = await pool.query("UPDATE products SET image_url = ? WHERE id = ?", [
      imageUrl,
      productId,
    ]);
    if ((result as { affectedRows: number }).affectedRows === 0) {
      await deleteImageFile(imageUrl);
      return { ok: false, message: t("masterData.errProductNotFound") };
    }

    if (previousImageUrl) await deleteImageFile(previousImageUrl);
    return { ok: true };
  } catch (error) {
    console.error("uploadProductImage failed", error);
    return { ok: false, message: t("masterData.errCouldNotUploadImage") };
  }
}

export async function removeProductImage(productId: number): Promise<ActionResult> {
  await requireRole(ALLOWED_ROLES);
  const { t } = await getT();

  try {
    const previousImageUrl = await getCurrentImageUrl(productId);
    const [result] = await pool.query("UPDATE products SET image_url = NULL WHERE id = ?", [
      productId,
    ]);
    if ((result as { affectedRows: number }).affectedRows === 0) {
      return { ok: false, message: t("masterData.errProductNotFound") };
    }
    if (previousImageUrl) await deleteImageFile(previousImageUrl);
    return { ok: true };
  } catch (error) {
    console.error("removeProductImage failed", error);
    return { ok: false, message: t("masterData.errCouldNotRemoveImage") };
  }
}

// ── Chart of Accounts ────────────────────────────────────────────────────

interface AccountInput {
  code: string;
  name: string;
  description: string;
  accountType: AccountType;
  parentId: number | null;
  isCashBank: boolean;
  /**
   * Opening balance for ONE outlet (the outlet selected on the COA page), Dr-signed
   * (debit +, credit −; 0 clears it). Other outlets' balances are left untouched.
   */
  opening: { outletId: number; amount: number };
}

function validateAccountInput(input: AccountInput, t: TranslateFn): string | null {
  if (!input.code.trim()) return t("masterData.errAccountCodeRequired");
  if (!input.name.trim()) return t("masterData.errAccountNameRequired");
  if (!ACCOUNT_TYPES.includes(input.accountType)) return t("masterData.errAccountTypeInvalid");
  if (!input.opening || !Number.isInteger(input.opening.outletId) || !Number.isFinite(input.opening.amount)) {
    return t("masterData.errOpeningBalanceInvalid");
  }
  return null;
}

const OPENING_REASON_MESSAGE = {
  PROFIT_LOSS: "masterData.errOpeningNotForProfitLoss",
  HAS_CHILDREN: "masterData.errOpeningNotForParent",
  INVENTORY: "masterData.errOpeningNotForInventory",
} as const;

/**
 * Shared create/update: saves the account and replaces its per-outlet opening
 * balances in one transaction, enforcing the rules in lib/opening-balances.ts.
 */
async function saveAccount(input: AccountInput, id: number | null): Promise<ActionResult> {
  const session = await requireRole(COA_ROLES);
  const { t } = await getT();
  const validationError = validateAccountInput(input, t);
  if (validationError) return { ok: false, message: validationError };
  if (id !== null && input.parentId === id) {
    return { ok: false, message: t("masterData.errAccountCannotBeOwnParent") };
  }
  const outletId = input.opening.outletId;
  const amount = Math.round(input.opening.amount * 100) / 100;
  if (!(await hasOutletAccess(session, outletId))) {
    return { ok: false, message: t("masterData.errOpeningBalanceInvalid") };
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (input.parentId != null) {
      const [parents] = await conn.query<RowDataPacket[]>(
        `SELECT a.id, EXISTS (SELECT 1 FROM account_opening_balances b WHERE b.account_id = a.id AND b.amount <> 0) AS hasOpening
         FROM accounts a WHERE a.id = ?`,
        [input.parentId],
      );
      if (!parents.length) {
        await conn.rollback();
        return { ok: false, message: t("masterData.errParentAccountNotFound") };
      }
      // A parent's balance is the sum of its children — it can't carry its own opening balance.
      if (Number(parents[0].hasOpening)) {
        await conn.rollback();
        return { ok: false, message: t("masterData.errParentHasOpeningBalance") };
      }
    }

    let accountId = id;
    if (accountId === null) {
      const [result] = await conn.query(
        `INSERT INTO accounts (code, name, description, account_type, parent_id, is_cash_bank, status)
         VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
        [input.code.trim(), input.name.trim(), input.description.trim() || null, input.accountType, input.parentId, input.isCashBank ? 1 : 0],
      );
      accountId = (result as { insertId: number }).insertId;
    } else {
      const [result] = await conn.query(
        `UPDATE accounts SET code = ?, name = ?, description = ?, account_type = ?, parent_id = ?, is_cash_bank = ?
         WHERE id = ?`,
        [input.code.trim(), input.name.trim(), input.description.trim() || null, input.accountType, input.parentId, input.isCashBank ? 1 : 0, accountId],
      );
      if ((result as { affectedRows: number }).affectedRows === 0) {
        await conn.rollback();
        return { ok: false, message: t("masterData.errAccountNotFound") };
      }
    }

    const [children] = await conn.query<RowDataPacket[]>("SELECT 1 FROM accounts WHERE parent_id = ? LIMIT 1", [accountId]);
    const reason = openingIneligibleReason({
      accountType: input.accountType,
      code: input.code.trim(),
      hasChildren: children.length > 0,
    });
    if (reason && amount !== 0) {
      await conn.rollback();
      return { ok: false, message: t(OPENING_REASON_MESSAGE[reason]) };
    }

    if (reason) {
      // Account no longer qualifies (e.g. type changed to expense): drop any stale balances.
      await conn.query("DELETE FROM account_opening_balances WHERE account_id = ?", [accountId]);
    } else if (amount === 0) {
      await conn.query("DELETE FROM account_opening_balances WHERE account_id = ? AND outlet_id = ?", [accountId, outletId]);
    } else {
      await conn.query(
        `INSERT INTO account_opening_balances (account_id, outlet_id, amount, updated_by) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE amount = VALUES(amount), updated_by = VALUES(updated_by)`,
        [accountId, outletId, amount, Number(session.user.id) || null],
      );
    }

    await conn.commit();
    return { ok: true };
  } catch (error) {
    await conn.rollback();
    if (isDuplicateCodeError(error)) {
      return { ok: false, message: t("masterData.errAccountCodeExists") };
    }
    console.error("saveAccount failed", error);
    return { ok: false, message: t("masterData.errCouldNotSaveAccount") };
  } finally {
    conn.release();
  }
}

export async function createAccount(input: AccountInput): Promise<ActionResult> {
  return saveAccount(input, null);
}

export async function updateAccount(input: AccountInput & { id: number }): Promise<ActionResult> {
  return saveAccount(input, input.id);
}

export async function setAccountStatus(input: {
  id: number;
  status: "ACTIVE" | "INACTIVE";
}): Promise<ActionResult> {
  await requireRole(COA_ROLES);
  const { t } = await getT();
  if (input.status !== "ACTIVE" && input.status !== "INACTIVE") {
    return { ok: false, message: t("inventory.errInvalidStatus") };
  }

  try {
    const [result] = await pool.query("UPDATE accounts SET status = ? WHERE id = ?", [
      input.status,
      input.id,
    ]);
    if ((result as { affectedRows: number }).affectedRows === 0) {
      return { ok: false, message: t("masterData.errAccountNotFound") };
    }
    return { ok: true };
  } catch (error) {
    console.error("setAccountStatus failed", error);
    return { ok: false, message: t("masterData.errCouldNotUpdateAccountStatus") };
  }
}
