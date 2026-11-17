import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { landingPathFor } from "@/lib/landing";

// Every sign-in (credentials and Google) lands here; the first page follows
// the menu access matrix (lib/landing.ts).
export default async function PostLoginPage() {
  const session = await auth();
  if (!session?.user) redirect("/");
  redirect(await landingPathFor(session));
}
