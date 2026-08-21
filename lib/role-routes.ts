const ROLE_LANDING: [string, string][] = [
  ["ADMIN", "/dashboard"],
  ["GM", "/dashboard"],
  ["MANAGER", "/pos"],
  ["CASHIER", "/pos"],
];

export function getLandingPath(roles: string[]): string {
  const match = ROLE_LANDING.find(([role]) => roles.includes(role));
  return match ? match[1] : "/unauthorized";
}
