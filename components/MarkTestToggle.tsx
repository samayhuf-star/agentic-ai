"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MarkTestToggle({ orderId, isTest }: { orderId: string; isTest: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function toggle() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/test-payment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId, isTest: !isTest }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    setBusy(false);
    setMessage(data.message || (response.ok ? "Saved." : "Could not save."));
    if (response.ok) router.refresh();
  }

  return (
    <div>
      <button className="btn btn-g" type="button" onClick={toggle} disabled={busy}>
        {busy ? "Saving…" : isTest ? "Unmark test" : "Mark as test"}
      </button>
      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}
