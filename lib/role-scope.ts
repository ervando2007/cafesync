/**
 * Outlet scope per role (shared by the user form and the server actions).
 * ADMIN/GM see every outlet (see hasOutletAccess); these roles only see the
 * outlets assigned to the user in user_outlets, so they need at least one.
 */
export const GLOBAL_OUTLET_ROLE_CODES = ["ADMIN", "GM"];
export const OUTLET_SCOPED_ROLE_CODES = ["MANAGER", "ACCOUNTING", "CASHIER"];

export function needsOutletAssignment(roleCodes: string[]): boolean {
  return (
    !roleCodes.some((code) => GLOBAL_OUTLET_ROLE_CODES.includes(code)) &&
    roleCodes.some((code) => OUTLET_SCOPED_ROLE_CODES.includes(code))
  );
}
