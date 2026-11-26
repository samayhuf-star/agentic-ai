import { json, readJson } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/admin/api";
import { markPaidViaRazorpay } from "@/lib/payments/razorpay-backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const gate = await requireSuperAdmin(request);
  if (!gate.ok) return gate.response;
  const body = await readJson(request);
  const result = await markPaidViaRazorpay({
    orderId: String(body.orderId || ""),
    razorpayPaymentId: String(body.razorpayPaymentId || body.paymentId || ""),
    actor: gate.session.email,
  });
  return json(
    { ok: result.ok, message: result.message, paymentId: "paymentId" in result ? result.paymentId : undefined, email: "email" in result ? result.email : undefined },
    result.status,
  );
}
