"use client";

import { useState } from "react";
import { BusinessPicker, type PickerValue } from "@/components/BusinessPicker";
import { SaveChangesButton } from "@/components/SaveChangesButton";
import { categoryById } from "@/lib/business-catalog";
import { indianMobile } from "@/lib/phone";
import type { SavePhase } from "@/lib/settings-view";

export type ProfileValues = {
  businessName: string;
  sells: string;
  category: string;
  businessType: string;
  customType: string;
  email: string;
  phone: string;
};

export function BusinessProfileForm({ initial }: { initial: ProfileValues }) {
  const [base, setBase] = useState(initial);
  const [name, setName] = useState(initial.businessName);
  const [picker, setPicker] = useState<PickerValue>({
    category: initial.category,
    businessType: initial.businessType,
    customType: initial.customType,
  });
  const [phone, setPhone] = useState(initial.phone);
  const [phase, setPhase] = useState<SavePhase>("idle");
  const [message, setMessage] = useState("");
  const dirty =
    name !== base.businessName ||
    picker.category !== base.category ||
    picker.businessType !== base.businessType ||
    picker.customType !== base.customType ||
    phone !== base.phone;

  function touchName(value: string) {
    setName(value);
    setPhase("idle");
  }

  function touchPicker(next: PickerValue) {
    setPicker(next);
    setPhase("idle");
  }

  function touchPhone(value: string) {
    setPhone(value);
    setPhase("idle");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!dirty || phase === "saving") return;
    const trimmedPhone = phone.trim();
    if (trimmedPhone) {
      const checked = indianMobile(trimmedPhone);
      if (!checked.ok) {
        setPhase("error");
        setMessage(checked.error);
        return;
      }
    }
    setPhase("saving");
    setMessage("");
    const body: Record<string, string> = { businessName: name, phone: trimmedPhone };
    if (picker.category) {
      body.category = picker.category;
      body.businessType = picker.businessType;
      body.customType = picker.customType;
    } else if (initial.sells) {
      body.sells = initial.sells;
    }
    const response = await fetch("/api/dashboard/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    if (!response.ok) {
      setPhase("error");
      setMessage(data.message || "Could not save.");
      return;
    }
    setBase({
      ...base,
      businessName: name,
      category: picker.category,
      businessType: picker.businessType,
      customType: picker.customType,
      phone: trimmedPhone,
      sells: picker.category ? "" : base.sells,
    });
    setPhase("saved");
    setMessage("Saved.");
  }

  const savedCategory = categoryById(initial.category);
  return (
    <form id="business-profile" className="stack profile-form" onSubmit={save}>
      <h2>Business</h2>
      <label className="field">
        Business name
        <input type="text" autoComplete="organization" value={name} onChange={(event) => touchName(event.target.value)} required maxLength={80} />
      </label>
      <BusinessPicker value={picker} onChange={touchPicker} />
      {!savedCategory && initial.sells ? <p className="muted">Saved earlier: {initial.sells}</p> : null}
      <div className="contact-row">
        <span className="contact-label">Email</span>
        <span className="contact-value">{initial.email || "Not added yet"}</span>
        {initial.email ? <span className="contact-note">This is your login. It stays read-only.</span> : null}
      </div>
      <label className="field">
        Phone
        <input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => touchPhone(event.target.value)} aria-describedby="phone-hint" placeholder="10-digit mobile" />
      </label>
      <p id="phone-hint" className="muted">
        Add or edit a 10-digit Indian mobile number.
      </p>
      {message ? <p className={phase === "error" ? "error" : "muted"}>{message}</p> : null}
      <SaveChangesButton dirty={dirty} phase={phase} />
    </form>
  );
}
