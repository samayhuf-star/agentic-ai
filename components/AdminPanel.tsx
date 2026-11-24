"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GatewaySwitch({ current, readOnly = false }: { current: string; readOnly?: boolean }) {
  const router = useRouter();
  const [gateway, setGateway] = useState(current);
  const [message, setMessage] = useState("");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (readOnly) return;
    const response = await fetch("/api/admin/gateway", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gateway }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    setMessage(response.ok ? "Gateway saved. New payments use it." : data.message || "Could not save.");
    router.refresh();
  }

  return (
    <form className="stack" onSubmit={save}>
      <fieldset className="stack plain" disabled={readOnly}>
        {["cashfree", "razorpay", "payu"].map((name) => (
          <label key={name} className={gateway === name ? "onboard-choice on" : "onboard-choice"}>
            <input type="radio" name="gateway" value={name} checked={gateway === name} onChange={() => setGateway(name)} /> {name === "cashfree" ? "Cashfree" : name === "razorpay" ? "Razorpay" : "PayU"}
          </label>
        ))}
        <button className="btn btn-p" type="submit">
          Use this gateway
        </button>
      </fieldset>
      {message ? <p>{message}</p> : null}
    </form>
  );
}

export function TestEmailForm({ defaultTo, readOnly = false }: { defaultTo: string; readOnly?: boolean }) {
  const [to, setTo] = useState(defaultTo);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (readOnly) return;
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/test-email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    setBusy(false);
    setMessage(data.message || (response.ok ? "Sent." : "Could not send."));
  }

  return (
    <form className="stack" onSubmit={send}>
      <fieldset className="stack plain" disabled={readOnly}>
        <label className="field">
          Send a test email to
          <input type="email" value={to} onChange={(event) => setTo(event.target.value)} required={!readOnly} />
        </label>
        <button className="btn btn-p" type="submit" disabled={busy || readOnly}>
          {busy ? "Sending…" : "Send test email"}
        </button>
      </fieldset>
      {message ? <p>{message}</p> : null}
    </form>
  );
}

export function ResendButton({ userId, readOnly = false }: { userId: string; readOnly?: boolean }) {
  const [message, setMessage] = useState("");

  async function send() {
    if (readOnly) return;
    const response = await fetch("/api/admin/resend-welcome", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    setMessage(data.message || (response.ok ? "Sent." : "Could not send."));
  }

  return (
    <span>
      <button className="btn btn-g" type="button" onClick={send} disabled={readOnly} style={{ padding: "8px 10px" }}>
        Resend welcome
      </button>
      {message ? <small className="muted"> {message}</small> : null}
    </span>
  );
}
