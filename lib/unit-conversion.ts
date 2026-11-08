/**
 * Recipe-line unit → stock-unit conversion (database/28_unit_conversion.sql).
 * A recipe line may use any unit in the same group as its stock item's unit:
 * 18 GR of an ingredient stocked in KG consumes 0.018 KG.
 */

export interface ConvertibleUnit {
  id: number;
  code: string;
  name: string;
  unitGroup: string | null;
  baseConversion: number;
}

/** Factor that turns 1 `from` into stock units, or null when the units can't convert. */
export function toStockFactor(from: ConvertibleUnit, stock: ConvertibleUnit): number | null {
  if (from.id === stock.id) return 1;
  if (!from.unitGroup || from.unitGroup !== stock.unitGroup || !stock.baseConversion) return null;
  return from.baseConversion / stock.baseConversion;
}

/**
 * SQL expression for the same factor. Needs aliases `ru` (recipe line's unit)
 * and `su` (stock item's unit) joined in the query. Incompatible pairs (only
 * possible in legacy rows — saving validates) fall back to 1.
 */
export const SQL_TO_STOCK_FACTOR = `(CASE
  WHEN ru.id = su.id THEN 1
  WHEN ru.unit_group IS NOT NULL AND ru.unit_group = su.unit_group AND su.base_conversion > 0
    THEN ru.base_conversion / su.base_conversion
  ELSE 1 END)`;
