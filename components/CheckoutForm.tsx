"use client";

import { trackLead } from "@/lib/marketing/pixel-client";
import { useState } from "react";
import { indianMobile } from "@/lib/phone";

type Errors = { name?: string; email?: string; phone?: string; form?: string };

function problems(name: string, email: string, phone: string): Errors {
  const next: Errors = {};
  if (name.trim().length < 2) next.name = "Enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Enter a valid email.";
  const mobile = indianMobile(phone);
  if (!mobile.ok) next.phone = mobile.error;
  return next;
}

export function CheckoutForm({ price }: { price: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState({ name: false, email: false, phone: false });
  const local = problems(name, email, phone);
  const shown: Errors = {
    name: touched.name ? local.name : errors.name,
    email: touched.email ? local.email : errors.email,
    phone: touched.phone ? local.phone : errors.phone,
    form: errors.form,
  };
  const ready = Object.keys(local).length === 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setTouched({ name: true, email: true, phone: true });
    setErrors(local);
    if (Object.keys(local).length > 0) return;
    setBusy(true);
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, phone }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string; field?: string; redirect?: string; leadEventId?: string };
    setBusy(false);
    if (!response.ok || !data.redirect) {
      const field = data.field === "name" || data.field === "email" || data.field === "phone" ? data.field : "form";
      setErrors({ [field]: data.message || "We could not open checkout. Please try again." });
      return;
    }
    if (data.leadEventId) trackLead(data.leadEventId);
    window.location.assign(data.redirect);
  }

  return (
    <form className="stack checkout-form" onSubmit={submit} noValidate>
      <label className="field">
        Full name
        <input value={name} onChange={(event) => setName(event.target.value)} onBlur={() => setTouched((state) => ({ ...state, name: true }))} autoComplete="name" autoCapitalize="words" />
        {shown.name ? <span className="field-error">{shown.name}</span> : null}
      </label>
      <label className="field">
        Email
        <input value={email} onChange={(event) => setEmail(event.target.value)} onBlur={() => setTouched((state) => ({ ...state, email: true }))} autoComplete="email" inputMode="email" />
        {shown.email ? <span className="field-error">{shown.email}</span> : null}
      </label>
      <label className="field">
        Mobile number
        <input value={phone} onChange={(event) => setPhone(event.target.value)} onBlur={() => setTouched((state) => ({ ...state, phone: true }))} autoComplete="tel" inputMode="tel" />
        {shown.phone ? <span className="field-error">{shown.phone}</span> : null}
      </label>
      {shown.form ? <p className="field-error">{shown.form}</p> : null}
      <button className="btn btn-p" type="submit" disabled={busy || !ready}>
        {busy ? "Opening secure payment…" : `Pay ${price}`}
      </button>
      <p className="key-note">You connect your own AI key (Claude, ChatGPT or Grok) for AI tasks. AI usage is billed by your AI provider. AI Time Machine provides the skills and the platform to manage everything in one place.</p>
      <p className="key-note">Your AI team prepares drafts and ideas for you. Nothing goes out without your yes. Agents do not run on their own in the background yet.</p>
    </form>
  );
}
