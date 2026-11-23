import { json } from "@/lib/api";
import { getSessionFromRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return json({ ok: false });
  const owner = Boolean(session.isAdmin || session.user?.compAccess);
  const href = !session.user ? "/sup-admin" : owner || session.user.onboardedAt ? "/dashboard" : "/onboarding";
  return json({ ok: true, href });
}
