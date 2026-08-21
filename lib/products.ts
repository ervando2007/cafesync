import "server-only";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";

export type MasterStatus = "ACTIVE" | "INACTIVE";
export type ProductType = "FOOD" | "BEVERAGE" | "MERCHANDISE" | "SERVICE";

export interface ProductRecord {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  categoryId: number | null;
  categoryName: string | null;
  productType: ProductType;
  baseUnitId: number | null;
  baseUnitName: string | null;
  status: MasterStatus;
  outletCount: number;
}

export async function getProducts(): Promise<ProductRecord[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT p.id, p.sku, p.name, p.description, p.image_url AS imageUrl,
            p.category_id AS categoryId, c.name AS categoryName,
            p.product_type AS productType,
            p.base_unit_id AS baseUnitId, u.name AS baseUnitName,
            p.status,
            (SELECT COUNT(*) FROM outlet_products op WHERE op.product_id = p.id) AS outletCount
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN units u ON u.id = p.base_unit_id
     ORDER BY p.name`,
  );
  return rows.map((r) => ({
    id: Number(r.id),
    sku: String(r.sku),
    name: String(r.name),
    description: r.description === null ? null : String(r.description),
    imageUrl: r.imageUrl === null ? null : String(r.imageUrl),
    categoryId: r.categoryId === null ? null : Number(r.categoryId),
    categoryName: r.categoryName === null ? null : String(r.categoryName),
    productType: r.productType as ProductType,
    baseUnitId: r.baseUnitId === null ? null : Number(r.baseUnitId),
    baseUnitName: r.baseUnitName === null ? null : String(r.baseUnitName),
    status: r.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    outletCount: Number(r.outletCount),
  }));
}

export interface ProductCategoryOption {
  id: number;
  name: string;
  status: MasterStatus;
}

export async function getProductCategories(): Promise<ProductCategoryOption[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, name, status FROM categories ORDER BY name",
  );
  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    status: r.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
  }));
}

export interface OutletPriceRow {
  outletId: number;
  outletName: string;
  sellingPrice: number | null;
  taxRate: number | null;
  isAvailable: boolean;
  isSet: boolean;
}

export async function getOutletPricesForProduct(productId: number): Promise<OutletPriceRow[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT o.id AS outletId, o.name AS outletName,
            op.selling_price AS sellingPrice, op.tax_rate AS taxRate, op.is_available AS isAvailable
     FROM outlets o
     LEFT JOIN outlet_products op ON op.outlet_id = o.id AND op.product_id = ?
     WHERE o.status = 'ACTIVE'
     ORDER BY o.name`,
    [productId],
  );
  return rows.map((r) => ({
    outletId: Number(r.outletId),
    outletName: String(r.outletName),
    sellingPrice: r.sellingPrice === null ? null : Number(r.sellingPrice),
    taxRate: r.taxRate === null ? null : Number(r.taxRate),
    isAvailable: r.isAvailable === null ? true : Boolean(r.isAvailable),
    isSet: r.sellingPrice !== null,
  }));
}
