import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLandingPath } from "@/lib/role-routes";

// OAuth sign-ins (Google) land here so they get the same role-based routing
// as credentials sign-ins instead of a hard-coded destination.
export default async function PostLoginPage() {
  const session = await auth();
  if (!session?.user) redirect("/");
  redirect(getLandingPath(session.user.roles ?? []));
}
