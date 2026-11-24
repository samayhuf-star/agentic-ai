import { redirect } from "next/navigation";
import { resolveAccessRole, type AccessRole } from "@/lib/config";
import { getSession } from "@/lib/session";

export async function requireAdminPage() {
  const session = await getSession();
  const role: AccessRole = session ? resolveAccessRole(session.email, Boolean(session.userId)) : "none";
  if (!session || (role !== "admin" && role !== "staff")) redirect("/login");
  return { session, role, readOnly: role === "staff" };
}
