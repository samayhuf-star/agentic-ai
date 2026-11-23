import { json } from "@/lib/api";
import { requireAdmin } from "@/lib/api";
import { deliverOwnerAlert } from "@/lib/alerts/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return json({ message: "Admins only." }, 403);
  await deliverOwnerAlert({
    kind: "test",
    name: "Test",
    email: admin.email,
    status: "test",
    amountInr: null,
    orderId: null,
  });
  return json({ message: "Test alert sent. Check Alerts if a channel is configured." });
}
