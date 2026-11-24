import { json, readJson, requireAdmin } from "@/lib/api";
import { isGateway } from "@/lib/payments/signature";
import { setActiveGateway } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return json({ message: "Admins only." }, 403);
  const body = await readJson(request);
  const gateway = String(body.gateway || "");
  if (!isGateway(gateway)) return json({ message: "Pick Cashfree, Razorpay or PayU." }, 400);
  await setActiveGateway(gateway);
  return json({ ok: true, gateway });
}
