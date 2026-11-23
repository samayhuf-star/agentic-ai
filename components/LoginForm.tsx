"use client";

import { useCallback, useRef, useState } from "react";
import { OtpInput } from "@/components/OtpInput";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<0 | 1>(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const verifyCode = useCallback((next: string) => {
    if (formRef.current && next.length === 6) formRef.current.requestSubmit();
  }, []);

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/auth/request-code", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string; devCode?: string };
    setBusy(false);
    if (!response.ok) {
      setError(data.message || "Try again.");
      return;
    }
    setStep(1);
    setMessage(data.devCode ? `Your code is ${data.devCode}. Email is in test mode, so it is shown here.` : data.message || "Check your inbox.");
  }

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

  return (
    <div className="page prose">
      <h1>Sign in</h1>
      <p>No password. We email a 6-digit code.</p>
      {step === 0 ? (
        <form className="stack" onSubmit={requestCode}>
          <label className="field">
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button className="btn btn-p" type="submit" disabled={busy}>
            Email me a code
          </button>
        </form>
      ) : (
        <form className="stack" ref={formRef} onSubmit={verify}>
          <p>{message}</p>
          <label className="field">
            6-digit code
            <OtpInput onChange={setCode} onComplete={verifyCode} />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button className="btn btn-p" type="submit" disabled={busy || code.length !== 6}>
            Sign in
          </button>
        </form>
      )}
      <p>
        New here? <a href="/api/checkout">Get AI Time Machine</a>
      </p>
    </div>
  );
}
