import { json, readJson, requireUser } from "@/lib/api";
import { publicKeyFor, testAndMaybeSave } from "@/lib/ai/keys";
import { clientIp, hitLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function limited(request: Request, userId: string) {
  const gate = await hitLimit(`ai-key:${userId}:${clientIp(request)}`, 8, 10 * 60 * 1000);
  if (!gate.ok) return json({ message: "Too many tries. Wait a few minutes and try again." }, 429);
  return null;
}

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (!user) return json({ message: "Sign in first." }, 401);
  return json({ key: await publicKeyFor(user.id) });
}

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) return json({ message: "Sign in first." }, 401);
  const blocked = await limited(request, user.id);
  if (blocked) return blocked;
  const body = await readJson(request);
  const result = await testAndMaybeSave({
    userId: user.id,
    provider: String(body.provider || ""),
    model: String(body.model || ""),
    apiKey: typeof body.apiKey === "string" ? body.apiKey : "",
    save: true,
  });
  if (!result.ok) return json({ message: result.message }, result.status);
  return json({ ok: true, key: result.key });
}

export async function DELETE(request: Request) {
  const user = await requireUser(request);
  if (!user) return json({ message: "Sign in first." }, 401);
  await prisma.userAiKey.deleteMany({ where: { userId: user.id } });
  return json({ ok: true });
}
