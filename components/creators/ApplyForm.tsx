"use client";

import { useMemo, useState } from "react";
import {
  CONTENT_TYPES,
  COUNTRIES,
  FOLLOWER_RANGES,
  PLATFORMS,
  SELECTABLE_APPS,
} from "@/lib/creators/apps";

const empty = {
  name: "",
  email: "",
  phone: "",
  country: "India",
  platform: "",
  profileUrls: "",
  followerRange: "",
  niche: "",
  languages: "",
  sampleLinks: "",
  note: "",
  website: "",
};

export function CreatorApplyForm() {
  const [f, setF] = useState(empty);
  const [apps, setApps] = useState<string[]>([]);
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const allSelected = apps.length === SELECTABLE_APPS.length;
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });

  const summary = useMemo(() => (allSelected ? "All apps selected" : `${apps.length} selected`), [allSelected, apps.length]);

  function toggleApp(id: string) {
    setApps((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleAll() {
    setApps(allSelected ? [] : SELECTABLE_APPS.map((app) => app.id));
  }

  function toggleContent(id: string) {
    setContentTypes((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!apps.length) return setError("Select at least one app.");
    if (!contentTypes.length) return setError("Select at least one content type.");
    if (!consent) return setError("Please confirm you agree to be contacted about this application.");
    setBusy(true);
    try {
      const res = await fetch("/api/creators/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...f, selectedApps: apps, contentTypes, consent }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) setError(data.message || "Something went wrong. Try again.");
      else setDone(data.message || "Thanks. We received your application and will be in touch if there is a fit.");
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
        <p>{done}</p>
        <p className="muted">If it looks like a fit, we will email you. There is no need to apply again unless your details change.</p>
      </div>
    );
  }

  return (
    <form className="card creator-form" onSubmit={submit} noValidate>
      <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
        <div className="creator-apps-head">
          <div>
            <h2>Which apps are you interested in?</h2>
            <p className="muted">Select one or more. {summary}.</p>
          </div>
          <button type="button" className="btn btn-g btn-sm" onClick={toggleAll}>
            {allSelected ? "Clear all" : "Select all"}
          </button>
        </div>
        <div className="creator-apps" role="group" aria-label="Apps">
          {SELECTABLE_APPS.map((app) => {
            const on = apps.includes(app.id);
            return (
              <div key={app.id} className={on ? "creator-app is-on" : "creator-app"}>
                <button type="button" className="creator-app-main" aria-pressed={on} onClick={() => toggleApp(app.id)}>
                  <span className="creator-app-icon">
                    {app.icon ? <img src={app.icon} alt="" width={48} height={48} /> : app.initials}
                  </span>
                  <span>
                    <b>{app.name}</b>
                    <small>{app.blurb}</small>
                  </span>
                </button>
                {app.href ? (
                  <a className="creator-app-link" href={app.href} target="_blank" rel="noreferrer">
                    {app.hrefLabel || "Open"} ↗
                  </a>
                ) : null}
              </div>
            );
          })}
        </div>

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
            Phone / WhatsApp
            <input inputMode="tel" value={f.phone} onChange={set("phone")} autoComplete="tel" placeholder="Optional" maxLength={40} />
          </label>
          <label className="field">
            Country *
            <select value={f.country} onChange={set("country")} required>
              {COUNTRIES.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Primary platform *
            <select value={f.platform} onChange={set("platform")} required>
              <option value="">Select a platform</option>
              {PLATFORMS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Follower count *
            <select value={f.followerRange} onChange={set("followerRange")} required>
              <option value="">Select a range</option>
              {FOLLOWER_RANGES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          Profile URL(s) *
          <textarea
            value={f.profileUrls}
            onChange={set("profileUrls")}
            rows={3}
            placeholder="https://instagram.com/yourname"
            required
          />
        </label>
        <label className="field">
          Niche *
          <input value={f.niche} onChange={set("niche")} maxLength={80} placeholder="Business, fitness, entertainment…" required />
        </label>

        <fieldset className="creator-chips">
          <legend>Content types *</legend>
          <div className="aff-toggles">
            {CONTENT_TYPES.map((item) => (
              <label key={item.id} className="aff-toggle">
                <input type="checkbox" checked={contentTypes.includes(item.id)} onChange={() => toggleContent(item.id)} />
                {item.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="field">
          Languages *
          <input value={f.languages} onChange={set("languages")} maxLength={120} placeholder="English, Hindi" required />
        </label>


        <label className="field">
          Sample work links
          <textarea value={f.sampleLinks} onChange={set("sampleLinks")} rows={3} placeholder="Optional. One link per line." />
        </label>
        <label className="field">
          Anything else we should know?
          <textarea value={f.note} onChange={set("note")} rows={4} maxLength={2000} />
        </label>

        <label className="hp" aria-hidden="true">
          Website
          <input value={f.website} onChange={set("website")} tabIndex={-1} autoComplete="off" />
        </label>

        <label className="aff-toggle">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          I agree to be contacted about this application and confirm the details are accurate. *
        </label>

        {error ? <p className="form-error">{error}</p> : null}
        <button className="btn btn-p creator-submit" type="submit">
          {busy ? "Sending…" : "Submit application"}
        </button>
      </fieldset>
    </form>
  );
}
