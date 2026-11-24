import { json, readJson, requireUser } from "@/lib/api";
import { testAndMaybeSave } from "@/lib/ai/keys";
import { clientIp, hitLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) return json({ message: "Sign in first." }, 401);
  const gate = await hitLimit(`ai-key:${user.id}:${clientIp(request)}`, 8, 10 * 60 * 1000);
  if (!gate.ok) return json({ message: "Too many tries. Wait a few minutes and try again." }, 429);
  const body = await readJson(request);
  const result = await testAndMaybeSave({
    userId: user.id,
    provider: String(body.provider || ""),
    model: String(body.model || ""),
    apiKey: typeof body.apiKey === "string" ? body.apiKey : "",
    save: false,
  });
  if (!result.ok) return json({ message: result.message }, result.status);
  return json({ ok: true, key: result.key });
}
