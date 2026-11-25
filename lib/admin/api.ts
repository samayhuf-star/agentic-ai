import type { Session } from "@prisma/client";
import { getSessionFromRequest } from "@/lib/auth";
import { appOrigin, isAdminEmail, isStaffEmail } from "@/lib/config";
import { json } from "@/lib/api";

type AdminCheck = { ok: true; session: Session } | { ok: false; response: Response };

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    return false;
  }
  const hosts = new Set<string>();
  const forwarded = request.headers.get("x-forwarded-host");
  const host = request.headers.get("host");
  if (forwarded) hosts.add(forwarded.split(",")[0].trim().toLowerCase());
  if (host) hosts.add(host.toLowerCase());
  try {
    hosts.add(new URL(appOrigin(request)).host.toLowerCase());
  } catch {
    // ignore
  }
  return hosts.has(originHost);
}

/**
 * Server-side gate for every super-admin API route.
 * 401 when signed out, 403 for staff (view only) or anyone not on ADMIN_EMAILS.
 */
export async function requireSuperAdmin(request: Request, { write = true } = {}): Promise<AdminCheck> {
  const session = await getSessionFromRequest(request);
  if (!session) return { ok: false, response: json({ message: "Sign in as an admin first." }, 401) };
  const email = session.email.trim().toLowerCase();
  const admin = isAdminEmail(email);
  if (!admin && !(isStaffEmail(email) && !write)) {
    const message = isStaffEmail(email) ? "Staff can view this. Changes are limited to admins." : "Admins only.";
    return { ok: false, response: json({ message }, 403) };
  }
  if (write && !sameOrigin(request)) return { ok: false, response: json({ message: "Cross-site request blocked." }, 403) };
  return { ok: true, session };
}
