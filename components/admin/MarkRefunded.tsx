"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MarkRefunded({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (status !== "paid") return null;

  async function mark() {
    if (!window.confirm("Mark this paid order as refunded? It leaves paid revenue and is counted in refunds.")) return;
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/refund", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    setBusy(false);
    setMessage(data.message || (response.ok ? "Marked refunded." : "Could not save."));
    if (response.ok) router.refresh();
  }

  return (
    <div>
      <button className="btn btn-g" type="button" onClick={mark} disabled={busy}>
        {busy ? "Saving…" : "Mark refunded"}
      </button>
      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}
