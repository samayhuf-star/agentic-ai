"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MarkRefunded({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (status !== "paid") return null;

  async function mark() {
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
    if (response.ok) {
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <div>
      <button className="btn btn-g" type="button" onClick={() => setOpen(true)} disabled={busy}>
        {busy ? "Saving…" : "Mark refunded"}
      </button>
      {message ? <p className="muted">{message}</p> : null}
      {open ? (
        <div className="confirm-layer" role="presentation">
          <div className="confirm-card" role="dialog" aria-modal="true" aria-labelledby="refund-title">
            <h2 id="refund-title">Mark this order refunded?</h2>
            <p>It leaves paid revenue and is counted in refunds. This records your email and the time.</p>
            <p className="muted">{orderId}</p>
            <div className="row-actions">
              <button className="btn btn-p" type="button" onClick={mark} disabled={busy}>
                {busy ? "Saving…" : "Mark refunded"}
              </button>
              <button className="btn btn-g" type="button" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
