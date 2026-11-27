import { requireSuperAdmin } from "@/lib/admin/api";
import { liveAnalytics, readLiveRange } from "@/lib/admin/live-analytics";
import { json } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gate = await requireSuperAdmin(request, { write: false });
  if (!gate.ok) return gate.response;
  const url = new URL(request.url);
  const range = readLiveRange({
    range: url.searchParams.get("range") || undefined,
    from: url.searchParams.get("from") || undefined,
    to: url.searchParams.get("to") || undefined,
    include: url.searchParams.get("include") || undefined,
  });
  const data = await liveAnalytics(range);
  return json(data);
}
