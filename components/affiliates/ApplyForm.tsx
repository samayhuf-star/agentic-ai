"use client";

import Link from "next/link";
import { useState } from "react";
import { CopyButton } from "@/components/affiliates/CopyButton";
import { EMPTY_PAYOUT, PayoutFieldsInputs } from "@/components/affiliates/PayoutForm";

const NICHES = ["Business & startups", "Marketing", "Tech & AI", "Finance", "Education", "Lifestyle", "Comedy & entertainment", "Other"];

export function ApplyForm() {
  const [f, setF] = useState({ name: "", email: "", phone: "", city: "", instagramUrl: "", tiktokUrl: "", followers: "", niche: "", pitch: "", website: "" });
  const [terms, setTerms] = useState(false);
  const [withPayout, setWithPayout] = useState(false);
  const [payout, setPayout] = useState(EMPTY_PAYOUT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ url?: string; emailed?: boolean; text?: string } | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!f.instagramUrl.trim() && !f.tiktokUrl.trim()) return setError("Add your Instagram or TikTok profile link.");
    if (!terms) return setError("Please agree to the partner terms.");
    setBusy(true);
    try {
      const res = await fetch("/api/partners/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...f, terms, payout: withPayout ? payout : undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; dashboardUrl?: string; emailed?: boolean };
      if (!res.ok) setError(data.message || "Something went wrong. Try again.");
      else setDone({ url: data.dashboardUrl, emailed: data.emailed, text: data.message });
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card apply-done" role="status">
        <h2>Application received</h2>
        {done.url ? (
          <>
            <p>This is your private dashboard. Save it now; anyone with the link can see it.</p>
            <div className="aff-link-row">
              <code>{done.url}</code>
              <CopyButton value={done.url} />
            </div>
            <p className="muted">{done.emailed ? "We also emailed it to you." : "We couldn't email it right now, so copy it from here."}</p>
            <p>
              It shows <b>Under review</b> until we approve you, usually within 2 working days. Your referral link starts tracking once you&apos;re approved.
            </p>
            <a className="btn btn-p" href={done.url}>
              Open my dashboard
            </a>
          </>
        ) : (
          <p>{done.text}</p>
        )}
      </div>
    );
  }

  return (
    <form className="card apply-form" onSubmit={submit} noValidate>
      <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
        <div className="adm-grid">
          <label className="field">
            Full name *
            <input value={f.name} onChange={set("name")} autoComplete="name" maxLength={80} required />
          </label>
          <label className="field">
            Email *
            <input type="email" value={f.email} onChange={set("email")} autoComplete="email" maxLength={200} required />
          </label>
          <label className="field">
            Mobile *
            <input inputMode="tel" value={f.phone} onChange={set("phone")} autoComplete="tel" placeholder="98xxxxxxxx" required />
          </label>
          <label className="field">
            City *
            <input value={f.city} onChange={set("city")} autoComplete="address-level2" maxLength={60} required />
          </label>
          <label className="field">
            Instagram profile link
            <input value={f.instagramUrl} onChange={set("instagramUrl")} placeholder="https://www.instagram.com/yourname" />
          </label>
          <label className="field">
            TikTok profile link
            <input value={f.tiktokUrl} onChange={set("tiktokUrl")} placeholder="https://www.tiktok.com/@yourname" />
          </label>
          <label className="field">
            Followers (your biggest account) *
            <input value={f.followers} onChange={set("followers")} placeholder="12000 or 12k" required />
          </label>
          <label className="field">
            Niche *
            <select value={f.niche} onChange={set("niche")} required>
              <option value="">Pick one</option>
              {NICHES.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
        <small className="muted">Add at least one of Instagram or TikTok.</small>
        <label className="field">
          Why you, and what would you post? *
          <textarea rows={4} value={f.pitch} onChange={set("pitch")} maxLength={2000} placeholder="Who follows you, and 2–3 post ideas for AI Time Machine." required />
        </label>
        <label className="hp" aria-hidden="true">
          Website
          <input tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} />
        </label>
        <label className="aff-toggle">
          <input type="checkbox" checked={withPayout} onChange={(e) => setWithPayout(e.target.checked)} />
          Add payout details now (optional, you can add them later)
        </label>
        {withPayout ? <PayoutFieldsInputs values={payout} onChange={setPayout} /> : null}
        <label className="aff-toggle">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
          <span>
            I agree to the{" "}
            <Link href="/partners/terms" target="_blank">
              partner terms
            </Link>
            .
          </span>
        </label>
        {error ? (
          <p className="adm-msg err" role="alert">
            {error}
          </p>
        ) : null}
        <button className="btn btn-p" type="submit" style={{ marginTop: 12 }}>
          {busy ? "Sending…" : "Apply"}
        </button>
      </fieldset>
    </form>
  );
}
