"use server";

import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { requireRole } from "@/lib/auth-guard";
import pool from "@/lib/db";

const PRODUCT_IMAGE_DIR = path.join(process.cwd(), "public", "uploads", "products");
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const ALLOWED_ROLES = ["ADMIN", "GM"];

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

function validateOutletInput(input: OutletInput): string | null {
  if (!input.code.trim()) return "Outlet code is required.";
  if (!input.name.trim()) return "Outlet name is required.";
  if (!input.timezone.trim()) return "Timezone is required.";
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
  const validationError = validateOutletInput(input);
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
      return { ok: false, message: "An outlet with this code already exists." };
    }
    console.error("createOutlet failed", error);
    return { ok: false, message: "Could not save outlet. Please try again." };
  }
}

export async function updateOutlet(input: OutletInput & { id: number }): Promise<ActionResult> {
  await requireRole(ALLOWED_ROLES);
  const validationError = validateOutletInput(input);
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
      return { ok: false, message: "Outlet not found." };
    }
    return { ok: true };
  } catch (error) {
    if (isDuplicateCodeError(error)) {
      return { ok: false, message: "An outlet with this code already exists." };
    }
    console.error("updateOutlet failed", error);
    return { ok: false, message: "Could not save outlet. Please try again." };
  }
}

export async function setOutletStatus(input: {
  id: number;
  status: "ACTIVE" | "INACTIVE";
}): Promise<ActionResult> {
  await requireRole(ALLOWED_ROLES);
  if (input.status !== "ACTIVE" && input.status !== "INACTIVE") {
    return { ok: false, message: "Invalid status." };
  }

  try {
    const [result] = await pool.query("UPDATE outlets SET status = ? WHERE id = ?", [
      input.status,
      input.id,
    ]);
    if ((result as { affectedRows: number }).affectedRows === 0) {
      return { ok: false, message: "Outlet not found." };
    }
    return { ok: true };
  } catch (error) {
    console.error("setOutletStatus failed", error);
    return { ok: false, message: "Could not update outlet status. Please try again." };
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

function validateProductInput(input: ProductInput): string | null {
  if (!input.sku.trim()) return "SKU is required.";
  if (!input.name.trim()) return "Name is required.";
  if (!PRODUCT_TYPES.includes(input.productType)) return "Invalid product type.";
  return null;
}

export async function createProduct(input: ProductInput): Promise<ActionResult> {
  await requireRole(ALLOWED_ROLES);
  const validationError = validateProductInput(input);
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
      return { ok: false, message: "A product with this SKU already exists." };
    }
    console.error("createProduct failed", error);
    return { ok: false, message: "Could not save product. Please try again." };
  }
}

export async function updateProduct(input: ProductInput & { id: number }): Promise<ActionResult> {
  await requireRole(ALLOWED_ROLES);
  const validationError = validateProductInput(input);
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
      return { ok: false, message: "Product not found." };
    }
    return { ok: true };
  } catch (error) {
    if (isDuplicateCodeError(error)) {
      return { ok: false, message: "A product with this SKU already exists." };
    }
    console.error("updateProduct failed", error);
    return { ok: false, message: "Could not save product. Please try again." };
  }
}

export async function setProductStatus(input: {
  id: number;
  status: "ACTIVE" | "INACTIVE";
}): Promise<ActionResult> {
  await requireRole(ALLOWED_ROLES);
  if (input.status !== "ACTIVE" && input.status !== "INACTIVE") {
    return { ok: false, message: "Invalid status." };
  }

  try {
    const [result] = await pool.query("UPDATE products SET status = ? WHERE id = ?", [
      input.status,
      input.id,
    ]);
    if ((result as { affectedRows: number }).affectedRows === 0) {
      return { ok: false, message: "Product not found." };
    }
    return { ok: true };
  } catch (error) {
    console.error("setProductStatus failed", error);
    return { ok: false, message: "Could not update product status. Please try again." };
  }
}

// ── Outlet Pricing ───────────────────────────────────────────────────────

export async function upsertOutletProduct(input: {
  outletId: number;
  productId: number;
  sellingPrice: number;
  taxRate: number;
  isAvailable: boolean;
}): Promise<ActionResult> {
  await requireRole(ALLOWED_ROLES);
  if (!Number.isFinite(input.sellingPrice) || input.sellingPrice < 0) {
    return { ok: false, message: "Selling price cannot be negative." };
  }
  if (!Number.isFinite(input.taxRate) || input.taxRate < 0) {
    return { ok: false, message: "Tax rate cannot be negative." };
  }

  try {
    await pool.query(
      `INSERT INTO outlet_products (outlet_id, product_id, selling_price, tax_rate, is_available)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE selling_price = VALUES(selling_price),
         tax_rate = VALUES(tax_rate), is_available = VALUES(is_available)`,
      [input.outletId, input.productId, input.sellingPrice, input.taxRate, input.isAvailable ? 1 : 0],
    );
    return { ok: true };
  } catch (error) {
    console.error("upsertOutletProduct failed", error);
    return { ok: false, message: "Could not save outlet pricing. Please try again." };
  }
}

export async function removeOutletProduct(input: {
  outletId: number;
  productId: number;
}): Promise<ActionResult> {
  await requireRole(ALLOWED_ROLES);

  try {
    await pool.query("DELETE FROM outlet_products WHERE outlet_id = ? AND product_id = ?", [
      input.outletId,
      input.productId,
    ]);
    return { ok: true };
  } catch (error) {
    console.error("removeOutletProduct failed", error);
    return { ok: false, message: "Could not remove outlet pricing. Please try again." };
  }
}

// ── Product Categories ──────────────────────────────────────────────────

export async function createProductCategory(input: { name: string }): Promise<ActionResult> {
  await requireRole(ALLOWED_ROLES);
  const name = input.name.trim();
  if (!name) return { ok: false, message: "Category name is required." };

  try {
    await pool.query("INSERT INTO categories (name, status) VALUES (?, 'ACTIVE')", [name]);
    return { ok: true };
  } catch (error) {
    if (isDuplicateCodeError(error)) {
      return { ok: false, message: "A category with this name already exists." };
    }
    console.error("createProductCategory failed", error);
    return { ok: false, message: "Could not save category. Please try again." };
  }
}

export async function updateProductCategory(input: {
  id: number;
  name: string;
}): Promise<ActionResult> {
  await requireRole(ALLOWED_ROLES);
  const name = input.name.trim();
  if (!name) return { ok: false, message: "Category name is required." };

  try {
    const [result] = await pool.query("UPDATE categories SET name = ? WHERE id = ?", [
      name,
      input.id,
    ]);
    if ((result as { affectedRows: number }).affectedRows === 0) {
      return { ok: false, message: "Category not found." };
    }
    return { ok: true };
  } catch (error) {
    if (isDuplicateCodeError(error)) {
      return { ok: false, message: "A category with this name already exists." };
    }
    console.error("updateProductCategory failed", error);
    return { ok: false, message: "Could not save category. Please try again." };
  }
}

export async function setProductCategoryStatus(input: {
  id: number;
  status: "ACTIVE" | "INACTIVE";
}): Promise<ActionResult> {
  await requireRole(ALLOWED_ROLES);
  if (input.status !== "ACTIVE" && input.status !== "INACTIVE") {
    return { ok: false, message: "Invalid status." };
  }

  try {
    const [result] = await pool.query("UPDATE categories SET status = ? WHERE id = ?", [
      input.status,
      input.id,
    ]);
    if ((result as { affectedRows: number }).affectedRows === 0) {
      return { ok: false, message: "Category not found." };
    }
    return { ok: true };
  } catch (error) {
    console.error("setProductCategoryStatus failed", error);
    return { ok: false, message: "Could not update category status. Please try again." };
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

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose an image file to upload." };
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { ok: false, message: "Only JPEG, PNG, or WebP images are allowed." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, message: "Image must be 4MB or smaller." };
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
      return { ok: false, message: "Product not found." };
    }

    if (previousImageUrl) await deleteImageFile(previousImageUrl);
    return { ok: true };
  } catch (error) {
    console.error("uploadProductImage failed", error);
    return { ok: false, message: "Could not upload image. Please try again." };
  }
}

export async function removeProductImage(productId: number): Promise<ActionResult> {
  await requireRole(ALLOWED_ROLES);

  try {
    const previousImageUrl = await getCurrentImageUrl(productId);
    const [result] = await pool.query("UPDATE products SET image_url = NULL WHERE id = ?", [
      productId,
    ]);
    if ((result as { affectedRows: number }).affectedRows === 0) {
      return { ok: false, message: "Product not found." };
    }
    if (previousImageUrl) await deleteImageFile(previousImageUrl);
    return { ok: true };
  } catch (error) {
    console.error("removeProductImage failed", error);
    return { ok: false, message: "Could not remove image. Please try again." };
  }
}
