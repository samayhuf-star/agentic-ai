"use client";

import { useCallback, useRef, useState } from "react";
import { OtpInput } from "@/components/OtpInput";

export function PaymentCodeForm({ email, orderId }: { email: string; orderId: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const verifyCode = useCallback((next: string) => {
    if (formRef.current && next.length === 6) formRef.current.requestSubmit();
  }, []);

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/auth/verify-code", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string; redirect?: string };
    setBusy(false);
    if (!response.ok) {
      setError(data.message || "That code did not work.");
      return;
    }
    window.location.replace(data.redirect || "/dashboard");
  }

  async function resend() {
    if (wait > 0 || busy) return;
    setBusy(true);
    setError("");
    const response = await fetch("/api/payment/resend-code", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    setBusy(false);
    if (!response.ok) {
      setError(data.message || "The code could not be sent.");
      return;
    }
    setNote(data.message || "A new code is on the way.");
    setWait(30);
    const timer = window.setInterval(() => {
      setWait((left) => {
        if (left <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return left - 1;
      });
    }, 1000);
  }

  return (
    <form className="stack" ref={formRef} onSubmit={verify}>
      <p>Payment received. Check your email, we&apos;ve sent your code.</p>
      <p className="muted">Sent to {email}</p>
      <label className="field">
        6-digit code
        <OtpInput onChange={setCode} onComplete={verifyCode} />
      </label>
      {error ? <p className="field-error">{error}</p> : null}
      {note ? <p>{note}</p> : null}
      <button className="btn btn-p" type="submit" disabled={busy || code.length !== 6}>
        Open my team
      </button>
      <p>
        <button className="text-link" type="button" onClick={resend} disabled={busy || wait > 0}>
          {wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
        </button>
      </p>
    </form>
  );
}
