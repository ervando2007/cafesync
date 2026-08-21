import type { Session } from "next-auth";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  GM: "General Manager",
  MANAGER: "Manager",
  CASHIER: "Cashier",
  ACCOUNTING: "Admin Accounting",
  CUSTOMER: "Customer",
};

const ROLE_PRIORITY = ["ADMIN", "GM", "MANAGER", "ACCOUNTING", "CASHIER", "CUSTOMER"];

export function resolveDisplayIdentity(session: Session): {
  userName: string;
  userRole: string;
} {
  const userName = session.user.name ?? session.user.email ?? "User";
  const primaryRole = ROLE_PRIORITY.find((role) => session.user.roles.includes(role));
  const userRole = primaryRole ? ROLE_LABELS[primaryRole] : "User";
  return { userName, userRole };
}
