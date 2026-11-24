import { json } from "@/lib/api";
import { runFollowups } from "@/lib/followups/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET || "";
  const header = request.headers.get("x-cron-secret") || "";
  if (!secret || header !== secret) return json({ message: "Not allowed." }, 401);
  const result = await runFollowups();
  return json({ ok: true, ...result });
}
