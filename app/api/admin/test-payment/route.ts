import { denyStaffMutation, json, readJson, requireAdmin } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { syncCommission } from "@/lib/affiliates/commission";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const staffDenied = await denyStaffMutation(request);
  if (staffDenied) return staffDenied;
  const admin = await requireAdmin(request);
  if (!admin) return json({ message: "Admins only." }, 403);
  const body = await readJson(request);
  const orderId = String(body.orderId || "");
  if (!orderId) return json({ message: "That payment was not found." }, 404);
  const payment = await prisma.payment.findUnique({ where: { id: orderId } });
  if (!payment) return json({ message: "That payment was not found." }, 404);
  const isTest = Boolean(body.isTest);
  await prisma.payment.update({ where: { id: orderId }, data: { isTest } });
  await syncCommission(orderId);
  return json({ message: isTest ? "Marked as a test payment." : "Marked as a real payment.", isTest });
}
