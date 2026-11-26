"use client";

import { trackLead } from "@/lib/marketing/pixel-client";
import { useState } from "react";
import { indianMobile } from "@/lib/phone";

type Errors = { name?: string; email?: string; phone?: string; form?: string };
type PayMethod = "upi" | "other";

function problems(name: string, email: string, phone: string): Errors {
  const next: Errors = {};
  if (name.trim().length < 2) next.name = "Enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Enter a valid email.";
  const mobile = indianMobile(phone);
  if (!mobile.ok) next.phone = mobile.error;
  return next;
}

function UpiLogos() {
  return (
    <span className="upi-logos" aria-hidden="true">
      <span className="upi-logo upi-logo-gpay" title="Google Pay">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path fill="#4285F4" d="M12 11.1v2.6h4.4c-.2 1.1-1.3 3.3-4.4 3.3-2.7 0-4.8-2.2-4.8-4.9S9.3 7.2 12 7.2c1.5 0 2.5.6 3.1 1.2l2.1-2.1C15.8 5 14.1 4.2 12 4.2 7.8 4.2 4.4 7.6 4.4 11.9S7.8 19.6 12 19.6c4.6 0 7.6-3.2 7.6-7.7 0-.5 0-.9-.1-1.3H12z" />
        </svg>
        GPay
      </span>
      <span className="upi-logo upi-logo-phonepe" title="PhonePe">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <rect width="24" height="24" rx="6" fill="#5F259F" />
          <path fill="#fff" d="M8.2 7.2h3.2c2.4 0 3.9 1.2 3.9 3.2 0 2.2-1.7 3.4-4.1 3.4H10v3h-1.8V7.2zm3.1 4.9c1.3 0 2.1-.6 2.1-1.7s-.8-1.6-2.1-1.6H10v3.3h1.3z" />
        </svg>
        PhonePe
      </span>
      <span className="upi-logo upi-logo-paytm" title="Paytm">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <rect width="24" height="24" rx="6" fill="#00BAF2" />
          <text x="12" y="16" textAnchor="middle" fontSize="8" fontWeight="700" fill="#012B51" fontFamily="Arial,sans-serif">
            pay
          </text>
        </svg>
        Paytm
      </span>
    </span>
  );
}

export function CheckoutForm({ price }: { price: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState<PayMethod | null>(null);
  const [touched, setTouched] = useState({ name: false, email: false, phone: false });
  const local = problems(name, email, phone);
  const shown: Errors = {
    name: touched.name ? local.name : errors.name,
    email: touched.email ? local.email : errors.email,
    phone: touched.phone ? local.phone : errors.phone,
    form: errors.form,
  };
  const ready = Object.keys(local).length === 0;

  async function submit(pay: PayMethod) {
    setTouched({ name: true, email: true, phone: true });
    setErrors(local);
    if (Object.keys(local).length > 0) return;
    setBusy(pay);
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, phone, pay }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string; field?: string; redirect?: string; leadEventId?: string };
    setBusy(null);
    if (!response.ok || !data.redirect) {
      const field = data.field === "name" || data.field === "email" || data.field === "phone" ? data.field : "form";
      setErrors({ [field]: data.message || "We could not open checkout. Please try again." });
      return;
    }
    if (data.leadEventId) trackLead(data.leadEventId);
    window.location.assign(data.redirect);
  }

  return (
    <form
      className="stack checkout-form"
      onSubmit={(event) => {
        event.preventDefault();
        void submit("upi");
      }}
      noValidate
    >
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
      <button className="btn btn-p btn-upi" type="submit" disabled={Boolean(busy) || !ready}>
        <span className="btn-upi-label">{busy === "upi" ? "Opening UPI…" : `Pay with UPI · ${price}`}</span>
        <UpiLogos />
      </button>
      <p className="upi-hint">On a phone, Google Pay, PhonePe or Paytm can open straight away. On a computer, you will get a QR code to scan with your phone.</p>
      <button
        className="text-link pay-other"
        type="button"
        disabled={Boolean(busy) || !ready}
        onClick={() => void submit("other")}
      >
        {busy === "other" ? "Opening payment…" : "Pay by card / net banking"}
      </button>
      <p className="key-note">You connect your own AI key (Claude, ChatGPT or Grok) for AI tasks. AI usage is billed by your AI provider. AI Time Machine provides the skills and the platform to manage everything in one place.</p>
      <p className="key-note">Your AI team prepares drafts and ideas for you. Nothing goes out without your yes. Agents do not run on their own in the background yet.</p>
    </form>
  );
}
