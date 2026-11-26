"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Msg, useApi } from "@/components/admin/console/useApi";

export function RazorpayPaidForm({
  orderId,
  readOnly = false,
}: {
  orderId?: string;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const { busy, message, call } = useApi();
  const [order, setOrder] = useState(orderId || "");
  const [payId, setPayId] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const result = await call("/api/admin/payments/razorpay", "POST", {
      orderId: (orderId || order).trim(),
      razorpayPaymentId: payId.trim(),
    });
    if (result.ok) {
      const id = typeof result.data.paymentId === "string" ? result.data.paymentId : (orderId || order).trim();
      setPayId("");
      if (id && !orderId) router.push(`/sup-admin/payments/${encodeURIComponent(id)}`);
      router.refresh();
    }
  }

  return (
    <form className="card" onSubmit={onSubmit} style={{ marginTop: 18 }}>
      <h2>Mark paid via Razorpay</h2>
      <p className="muted">
        Use this when a buyer paid the Razorpay backup link from a recovery email. Access is granted the same way as a Cashfree payment. This does not fire the Google Ads conversion.
      </p>
      {orderId ? null : (
        <label className="field full">
          Order id
          <input value={order} onChange={(e) => setOrder(e.target.value)} required autoComplete="off" placeholder="br…" />
        </label>
      )}
      <label className="field full">
        Razorpay payment id
        <input value={payId} onChange={(e) => setPayId(e.target.value)} required autoComplete="off" placeholder="pay_…" />
      </label>
      <div className="row-actions" style={{ marginTop: 12 }}>
        <button className="btn btn-sm btn-p" type="submit" disabled={busy || readOnly}>
          {busy ? "Working…" : "Mark paid via Razorpay"}
        </button>
      </div>
      <Msg message={message} />
    </form>
  );
}
