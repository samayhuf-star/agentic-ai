import { json } from "@/lib/api";
import { getSessionFromRequest } from "@/lib/auth";
import { skipsOnboarding } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return json({ ok: false });
  const href = !session.user ? "/sup-admin" : (await skipsOnboarding(session)) ? "/dashboard" : "/onboarding";
  return json({ ok: true, href });
}
