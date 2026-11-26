"use client";

import { useCallback, useRef, useState } from "react";
import { OtpInput } from "@/components/OtpInput";

type Step = "email" | "pin" | "code";

function nextFromPage() {
  if (typeof window === "undefined") return "";
  const raw = new URLSearchParams(window.location.search).get("next") || "";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "";
  return raw;
}

function emailFromPage() {
  if (typeof window === "undefined") return "";
  return (new URLSearchParams(window.location.search).get("email") || "").trim();
}

export function LoginForm() {
  const [email, setEmail] = useState(emailFromPage);
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const verifyCode = useCallback((next: string) => {
    if (formRef.current && next.length === 6) formRef.current.requestSubmit();
  }, []);

  async function requestCode() {
    const response = await fetch("/api/auth/request-code", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string; devCode?: string };
    if (!response.ok) {
      setError(data.message || "Try again.");
      return false;
    }
    setStep("code");
    setMessage(data.devCode ? `Your code is ${data.devCode}. Email is in test mode, so it is shown here.` : data.message || "Check your inbox.");
    return true;
  }

  async function continueWithEmail(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/auth/login-options", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string; pin?: boolean };
    if (!response.ok) {
      setBusy(false);
      setError(data.message || "Try again.");
      return;
    }
    if (data.pin) {
      setBusy(false);
      setPin("");
      setStep("pin");
      return;
    }
    await requestCode();
    setBusy(false);
  }

  async function emailCodeInstead(event: React.MouseEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    await requestCode();
    setBusy(false);
  }

  async function verifyPin(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/auth/verify-pin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, pin, next: nextFromPage() }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string; redirect?: string };
    setBusy(false);
    if (!response.ok) {
      setError(data.message || "That PIN did not work.");
      setPin("");
      return;
    }
    window.location.replace(data.redirect || "/dashboard");
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/auth/verify-code", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, code, next: nextFromPage() }),
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
      {step === "email" ? (
        <>
          <p>Enter your email to continue.</p>
          <form className="stack" onSubmit={continueWithEmail}>
            <label className="field">
              Email
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
            </label>
            {error ? <p className="error">{error}</p> : null}
            <button className="btn btn-p" type="submit" disabled={busy}>
              Continue
            </button>
          </form>
        </>
      ) : null}
      {step === "pin" ? (
        <>
          <p>Enter your 6-digit PIN.</p>
          <form className="stack" onSubmit={verifyPin}>
            <label className="field">
              6-digit PIN
              <input
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                pattern="[0-9]{6}"
                maxLength={6}
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                autoFocus
              />
            </label>
            {error ? <p className="error">{error}</p> : null}
            <button className="btn btn-p" type="submit" disabled={busy || pin.length !== 6}>
              Sign in
            </button>
          </form>
          <p className="muted">
            <a href="#email-code" onClick={emailCodeInstead}>
              Email me a code instead
            </a>
          </p>
        </>
      ) : null}
      {step === "code" ? (
        <>
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
        </>
      ) : null}
      <p>
        New here? <a href="/checkout">Get AI Time Machine</a>
      </p>
    </div>
  );
}
