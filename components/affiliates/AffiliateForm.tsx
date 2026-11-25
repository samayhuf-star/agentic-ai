"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Msg, useApi } from "@/components/admin/console/useApi";

export type AffiliateValues = {
  id?: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  instagramUrl: string;
  tiktokUrl: string;
  followers: string;
  niche: string;
  handles: string;
  code: string;
  commissionType: string;
  rate: string;
  status: string;
  payoutNotes: string;
  notes: string;
  hiddenBlocks: string[];
};

export function AffiliateForm({
  mode,
  initial,
  blocks,
  readOnly,
}: {
  mode: "create" | "edit";
  initial: AffiliateValues;
  blocks: { key: string; label: string }[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const { busy, message, call } = useApi();
  const [values, setValues] = useState(initial);
  const set = <K extends keyof AffiliateValues>(key: K, value: AffiliateValues[K]) => setValues((v) => ({ ...v, [key]: value }));
  const toggle = (key: string) =>
    set("hiddenBlocks", values.hiddenBlocks.includes(key) ? values.hiddenBlocks.filter((k) => k !== key) : [...values.hiddenBlocks, key]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const { id, ...body } = values;
    if (mode === "create") {
      const result = await call("/api/admin/affiliates", "POST", body);
      if (result.ok && typeof result.data.id === "string") router.push(`/sup-admin/affiliates/${result.data.id}`);
    } else {
      const result = await call(`/api/admin/affiliates/${id}`, "PATCH", { action: "update", ...body });
      if (result.ok) router.refresh();
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <fieldset disabled={readOnly || busy} style={{ border: 0, padding: 0, margin: 0 }}>
        <div className="adm-grid">
          <label className="field">
            Name *
            <input value={values.name} onChange={(e) => set("name", e.target.value)} maxLength={80} required />
          </label>
          <label className="field">
            Email
            <input type="email" value={values.email} onChange={(e) => set("email", e.target.value)} maxLength={200} />
          </label>
          <label className="field">
            Phone
            <input inputMode="tel" value={values.phone} onChange={(e) => set("phone", e.target.value)} />
          </label>
          <label className="field">
            City
            <input value={values.city} onChange={(e) => set("city", e.target.value)} maxLength={60} />
          </label>
          <label className="field">
            Instagram profile
            <input value={values.instagramUrl} onChange={(e) => set("instagramUrl", e.target.value)} placeholder="https://instagram.com/…" />
          </label>
          <label className="field">
            TikTok profile
            <input value={values.tiktokUrl} onChange={(e) => set("tiktokUrl", e.target.value)} placeholder="https://tiktok.com/@…" />
          </label>
          <label className="field">
            Followers (self-reported)
            <input value={values.followers} onChange={(e) => set("followers", e.target.value)} placeholder="12000 or 12k" />
          </label>
          <label className="field">
            Niche
            <input value={values.niche} onChange={(e) => set("niche", e.target.value)} maxLength={80} />
          </label>
          <label className="field">
            Referral code {mode === "create" ? "(blank = auto)" : ""}
            <input value={values.code} onChange={(e) => set("code", e.target.value.toUpperCase())} maxLength={32} placeholder="AUTO" />
          </label>
          <label className="field">
            Commission type
            <select value={values.commissionType} onChange={(e) => set("commissionType", e.target.value)}>
              <option value="percent">% of each sale</option>
              <option value="fixed">Fixed ₹ per sale</option>
            </select>
          </label>
          <label className="field">
            Rate {values.commissionType === "percent" ? "(%)" : "(₹)"} *
            <input inputMode="decimal" value={values.rate} onChange={(e) => set("rate", e.target.value)} required />
          </label>
          <label className="field">
            Status
            <select value={values.status} onChange={(e) => set("status", e.target.value)}>
              <option value="pending">Pending review</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
        </div>
        <label className="field">
          Other platforms / handles
          <textarea rows={2} value={values.handles} onChange={(e) => set("handles", e.target.value)} maxLength={1000} />
        </label>
        <label className="field">
          Payout notes (admin only)
          <textarea rows={2} value={values.payoutNotes} onChange={(e) => set("payoutNotes", e.target.value)} maxLength={1000} />
        </label>
        <label className="field">
          Notes (admin only)
          <textarea rows={3} value={values.notes} onChange={(e) => set("notes", e.target.value)} maxLength={2000} />
        </label>
        <div className="field">
          What the creator sees on their dashboard
          <div className="aff-toggles">
            {blocks.map((b) => (
              <label key={b.key} className="aff-toggle">
                <input type="checkbox" checked={!values.hiddenBlocks.includes(b.key)} onChange={() => toggle(b.key)} />
                {b.label}
              </label>
            ))}
          </div>
          <small className="muted">Unticked blocks are not shown and their numbers are never sent to the creator&apos;s page.</small>
        </div>
        <Msg message={message} />
        <div className="row-actions" style={{ marginTop: 12 }}>
          <button className="btn btn-p" type="submit">
            {busy ? "Saving…" : mode === "create" ? "Add affiliate" : "Save changes"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
