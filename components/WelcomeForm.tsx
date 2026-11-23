"use client";

import { useCallback, useRef, useState } from "react";
import { OtpInput } from "@/components/OtpInput";

export function WelcomeForm({ token }: { token: string }) {
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

  async function send(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/welcome", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, email }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string; devCode?: string };
    setBusy(false);
    if (!response.ok) {
      setError(data.message || "Try again.");
      return;
    }
    setStep(1);
    setMessage(data.devCode ? `Your code is ${data.devCode}. Email is in test mode, so it is shown here.` : "Check your inbox for a 6-digit code.");
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
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
    window.location.href = data.redirect || "/onboarding";
  }

  return (
    <div className="page prose">
      <h1>Add your email</h1>
      <p>Payment is in. Add the email you want to sign in with. We will send a one-time code. No password.</p>
      {step === 0 ? (
        <form className="stack" onSubmit={send}>
          <label className="field">
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button className="btn btn-p" type="submit" disabled={busy}>
            Send my code
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
            Open AI Time Machine
          </button>
        </form>
      )}
    </div>
  );
}
