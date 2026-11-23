import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ReturnPage({ searchParams }: { searchParams: Promise<{ order_id?: string }> }) {
  const { order_id: orderId } = await searchParams;
  redirect(orderId ? `/payment/success?order_id=${encodeURIComponent(orderId)}` : "/checkout");
}
