"use client";

import { useState } from "react";

export function TestAlertButton() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/test-alert", { method: "POST" });
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    setBusy(false);
    setMessage(data.message || (response.ok ? "Sent." : "Could not send."));
  }

  return (
    <div className="stack">
      <button className="btn btn-p" type="button" onClick={send} disabled={busy}>
        {busy ? "Sending…" : "Send test alert"}
      </button>
      {message ? <p>{message}</p> : null}
    </div>
  );
}
