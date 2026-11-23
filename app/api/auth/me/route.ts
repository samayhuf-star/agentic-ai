import { json } from "@/lib/api";
import { getSessionFromRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return json({ ok: false });
  const href = session.user?.onboardedAt ? "/dashboard" : session.user ? "/onboarding" : "/sup-admin";
  return json({ ok: true, href });
}
