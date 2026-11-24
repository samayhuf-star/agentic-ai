"use client";

import { useState } from "react";
import { BusinessPicker } from "@/components/dashboard/BusinessPicker";
import { saveButtonState, type SavePhase } from "@/lib/business-catalog";

export function ProfileForm({
  businessName,
  category,
  businessType,
  businessCustom,
  email,
  phone,
}: {
  businessName: string;
  category: string;
  businessType: string;
  businessCustom: string;
  email: string;
  phone: string;
}) {
  const [name, setName] = useState(businessName);
  const [pickedCategory, setCategory] = useState(category);
  const [pickedType, setType] = useState(businessType);
  const [custom, setCustom] = useState(businessCustom);
  const [mobile, setMobile] = useState(phone);
  const [base, setBase] = useState({ name: businessName, category, businessType, custom: businessCustom, phone });
  const [phase, setPhase] = useState<SavePhase>("idle");
  const [error, setError] = useState("");
  const dirty = name !== base.name || pickedCategory !== base.category || pickedType !== base.businessType || custom !== base.custom || mobile !== base.phone;
  const button = saveButtonState(dirty, phase);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPhase("saving");
    setError("");
    const response = await fetch("/api/dashboard/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        businessName: name,
        category: pickedCategory,
        businessType: pickedType,
        businessCustom: custom,
        phone: mobile,
      }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    if (!response.ok) {
      setPhase("error");
      setError(data.message || "Could not save.");
      return;
    }
    setBase({ name, category: pickedCategory, businessType: pickedType, custom, phone: mobile });
    setPhase("saved");
  }

  return (
    <form className="stack profile-form" id="profile" onSubmit={save}>
      <label className="field">
        Business name
        <input type="text" autoComplete="organization" value={name} onChange={(event) => { setName(event.target.value); setPhase("idle"); }} required />
      </label>
      <BusinessPicker
        category={pickedCategory}
        businessType={pickedType}
        custom={custom}
        onCategory={(id) => { setCategory(id); setPhase("idle"); }}
        onType={(id) => { setType(id); setPhase("idle"); }}
        onCustom={(value) => { setCustom(value); setPhase("idle"); }}
      />
      <label className="field">
        Email
        <input type="email" value={email} readOnly aria-readonly="true" />
      </label>
      <p className="muted">This is the email you sign in with.</p>
      <label className="field">
        Phone
        <input type="tel" inputMode="tel" autoComplete="tel" value={mobile} placeholder="10-digit mobile" onChange={(event) => { setMobile(event.target.value); setPhase("idle"); }} />
      </label>
      {error ? <p className="error">{error}</p> : null}
      <button className="btn btn-p" type="submit" disabled={button.disabled}>
        {button.label}
      </button>
    </form>
  );
}
