import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/config";
import { getSession } from "@/lib/session";

export async function requireAdminPage() {
  const session = await getSession();
  if (!session?.isAdmin || !isAdminEmail(session.email)) redirect("/login");
  return session;
}
