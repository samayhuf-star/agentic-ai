"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GatewaySwitch({ current }: { current: string }) {
  const router = useRouter();
  const [gateway, setGateway] = useState(current);
  const [message, setMessage] = useState("");

  async function save(event: React.FormEvent) {
    event.preventDefault();
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
      {["cashfree", "razorpay", "payu"].map((name) => (
        <label key={name}>
          <input type="radio" name="gateway" value={name} checked={gateway === name} onChange={() => setGateway(name)} /> {name === "cashfree" ? "Cashfree" : name === "razorpay" ? "Razorpay" : "PayU"}
        </label>
      ))}
      <button className="btn btn-p" type="submit">
        Use this gateway
      </button>
      {message ? <p>{message}</p> : null}
    </form>
  );
}

export function ResendButton({ userId }: { userId: string }) {
  const [message, setMessage] = useState("");

  async function send() {
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
      <button className="btn btn-g" type="button" onClick={send} style={{ padding: "8px 10px" }}>
        Resend welcome
      </button>
      {message ? <small className="muted"> {message}</small> : null}
    </span>
  );
}
