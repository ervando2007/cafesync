import "server-only";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { toStockFactor, type ConvertibleUnit } from "@/lib/unit-conversion";

export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
export type ItemMasterStatus = "ACTIVE" | "INACTIVE";

export interface StockItemRow {
  stockItemId: number;
  sku: string;
  name: string;
  categoryId: number;
  categoryName: string;
  accountId: number | null;
  unitId: number;
  unitName: string;
  reorderLevel: number;
  qtyOnHand: number;
  avgCost: number;
  stockValue: number;
  status: StockStatus;
  itemStatus: ItemMasterStatus;
}

function deriveStatus(qtyOnHand: number, reorderLevel: number): StockStatus {
  if (qtyOnHand <= 0) return "OUT_OF_STOCK";
  if (qtyOnHand <= reorderLevel) return "LOW_STOCK";
  return "IN_STOCK";
}

export async function getStockItems(outletId: number): Promise<StockItemRow[]> {
  const [rows] = await pool.query<(RowDataPacket & Record<string, unknown>)[]>(
    `SELECT si.id AS stockItemId, si.sku, si.name,
            si.category_id AS categoryId, c.name AS categoryName, si.account_id AS accountId,
            si.unit_id AS unitId, u.name AS unitName, si.reorder_level AS reorderLevel,
            si.status AS itemStatus,
            COALESCE(ist.qty_on_hand, 0) AS qtyOnHand, COALESCE(ist.avg_cost, 0) AS avgCost
     FROM stock_items si
     JOIN units u ON u.id = si.unit_id
     JOIN stock_item_categories c ON c.id = si.category_id
     LEFT JOIN inventory_stocks ist ON ist.stock_item_id = si.id AND ist.outlet_id = ?
     ORDER BY si.name`,
    [outletId],
  );

  return rows.map((r) => {
    const qtyOnHand = Number(r.qtyOnHand);
    const avgCost = Number(r.avgCost);
    const reorderLevel = Number(r.reorderLevel);
    return {
      stockItemId: Number(r.stockItemId),
      sku: String(r.sku),
      name: String(r.name),
      categoryId: Number(r.categoryId),
      categoryName: String(r.categoryName),
      accountId: r.accountId === null ? null : Number(r.accountId),
      unitId: Number(r.unitId),
      unitName: String(r.unitName),
      reorderLevel,
      qtyOnHand,
      avgCost,
      stockValue: qtyOnHand * avgCost,
      status: deriveStatus(qtyOnHand, reorderLevel),
      itemStatus: r.itemStatus === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    };
  });
}

export interface InventorySummary {
  totalItems: number;
  totalStockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  inStockCount: number;
}

export function summarizeStockItems(items: StockItemRow[]): InventorySummary {
  const active = items.filter((i) => i.itemStatus === "ACTIVE");
  return {
    totalItems: active.length,
    totalStockValue: active.reduce((sum, i) => sum + i.stockValue, 0),
    lowStockCount: active.filter((i) => i.status === "LOW_STOCK").length,
    outOfStockCount: active.filter((i) => i.status === "OUT_OF_STOCK").length,
    inStockCount: active.filter((i) => i.status === "IN_STOCK").length,
  };
}

/** A unit a recipe line may use for this stock item, with its factor into the stock unit. */
export interface RecipeUnitOption {
  unitId: number;
  code: string;
  name: string;
  /** 1 of this unit = `toStock` stock units (e.g. GR on a KG item → 0.001). */
  toStock: number;
}

export interface StockItemOption {
  stockItemId: number;
  sku: string;
  name: string;
  accountId: number | null;
  unitId: number;
  unitName: string;
  qtyOnHand: number;
  avgCost: number;
  /** Units selectable on a recipe line: the stock unit first, then same-group units. */
  recipeUnits: RecipeUnitOption[];
}

export async function getConvertibleUnits(): Promise<ConvertibleUnit[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, code, name, unit_group AS unitGroup, base_conversion AS baseConversion FROM units",
  );
  return rows.map((r) => ({
    id: Number(r.id),
    code: String(r.code),
    name: String(r.name),
    unitGroup: r.unitGroup === null ? null : String(r.unitGroup),
    baseConversion: Number(r.baseConversion),
  }));
}

export async function getStockItemOptions(outletId: number): Promise<StockItemOption[]> {
  const [items, units] = await Promise.all([getStockItems(outletId), getConvertibleUnits()]);
  const unitById = new Map(units.map((u) => [u.id, u]));
  return items
    .filter((i) => i.itemStatus === "ACTIVE")
    .map((i) => {
      const stockUnit = unitById.get(i.unitId);
      const recipeUnits: RecipeUnitOption[] = stockUnit
        ? units
            .map((u) => ({ u, toStock: toStockFactor(u, stockUnit) }))
            .filter((x): x is { u: ConvertibleUnit; toStock: number } => x.toStock !== null)
            .sort((a, b) => (a.u.id === stockUnit.id ? -1 : b.u.id === stockUnit.id ? 1 : a.toStock - b.toStock))
            .map(({ u, toStock }) => ({ unitId: u.id, code: u.code, name: u.name, toStock }))
        : [];
      return {
        stockItemId: i.stockItemId,
        sku: i.sku,
        name: i.name,
        accountId: i.accountId,
        unitId: i.unitId,
        unitName: i.unitName,
        qtyOnHand: i.qtyOnHand,
        avgCost: i.avgCost,
        recipeUnits,
      };
    });
}

export interface UnitOption {
  id: number;
  code: string;
  name: string;
}

export async function getUnits(): Promise<UnitOption[]> {
  const [rows] = await pool.query<(UnitOption & RowDataPacket)[]>(
    "SELECT id, code, name FROM units ORDER BY name",
  );
  return rows.map((r) => ({ id: Number(r.id), code: r.code, name: r.name }));
}

export interface CategoryOption {
  id: number;
  name: string;
  status: ItemMasterStatus;
}

export async function getCategories(): Promise<CategoryOption[]> {
  const [rows] = await pool.query<(RowDataPacket & Record<string, unknown>)[]>(
    "SELECT id, name, status FROM stock_item_categories ORDER BY name",
  );
  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    status: r.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
  }));
}

export interface SupplierRecord {
  id: number;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  status: ItemMasterStatus;
}

export async function getSupplierRecords(): Promise<SupplierRecord[]> {
  const [rows] = await pool.query<(RowDataPacket & Record<string, unknown>)[]>(
    "SELECT id, name, contact_person AS contactPerson, phone, status FROM suppliers ORDER BY name",
  );
  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    contactPerson: r.contactPerson === null ? null : String(r.contactPerson),
    phone: r.phone === null ? null : String(r.phone),
    status: r.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
  }));
}

export interface MovementRow {
  id: number;
  itemName: string;
  movementType: string;
  qty: number;
  unitCost: number;
  createdAt: string;
}

export async function getRecentMovements(outletId: number, limit = 8): Promise<MovementRow[]> {
  const [rows] = await pool.query<(RowDataPacket & Record<string, unknown>)[]>(
    `SELECT im.id, si.name AS itemName, im.movement_type AS movementType,
            im.qty, im.unit_cost AS unitCost, im.created_at AS createdAt
     FROM inventory_movements im
     JOIN stock_items si ON si.id = im.stock_item_id
     WHERE im.outlet_id = ?
     ORDER BY im.created_at DESC, im.id DESC
     LIMIT ?`,
    [outletId, limit],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    itemName: String(r.itemName),
    movementType: String(r.movementType),
    qty: Number(r.qty),
    unitCost: Number(r.unitCost),
    createdAt: String(r.createdAt),
  }));
}
