import { json, readJson, requireAdmin } from "@/lib/api";
import { fulfilOrder } from "@/lib/payments/manual";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return json({ message: "Admins only." }, 403);
  const body = await readJson(request);
  const result = await fulfilOrder(String(body.orderId || ""), { email: typeof body.email === "string" ? body.email : null });
  return json({ message: result.message, cashfreeStatus: "cashfreeStatus" in result ? result.cashfreeStatus : null }, result.status);
}
