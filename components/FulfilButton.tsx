"use client";

import { useState } from "react";

export function FulfilButton({ orderId, email }: { orderId: string; email: string }) {
  const [value, setValue] = useState(email);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function fulfil() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/fulfil", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId, email: value }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string; cashfreeStatus?: string | null };
    setBusy(false);
    const status = data.cashfreeStatus ? ` Cashfree: ${data.cashfreeStatus}.` : "";
    setMessage((data.message || (response.ok ? "Done." : "Could not fulfil.")) + status);
  }

  return (
    <div>
      <div className="fulfil-row">
        <input value={value} onChange={(event) => setValue(event.target.value)} aria-label={`Email for ${orderId}`} autoComplete="off" />
        <button className="btn btn-g" type="button" onClick={fulfil} disabled={busy}>
          {busy ? "Working…" : "Fulfil / resend code"}
        </button>
      </div>
      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}
