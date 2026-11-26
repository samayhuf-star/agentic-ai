"use client";

import { useState } from "react";

export function AgentLeadForm({ agentName, pagePath }: { agentName: string; pagePath: string }) {
  const [f, setF] = useState({ name: "", email: "", company: "", need: "", website: "" });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!consent) return setError("Please confirm we can contact you about your request.");
    setBusy(true);
    try {
      let timeZone = "";
      try {
        timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      } catch {}
      const res = await fetch("/api/agent-leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...f, agentType: agentName, pagePath, consent, timeZone }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) setError(data.message || "Something went wrong. Try again.");
      else setDone(data.message || "Thanks. We got your request and will reply by email.");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="aa-form-done" role="status">
        <strong>Request received.</strong> {done}
      </div>
    );
  }

  return (
    <form className="aa-form" onSubmit={submit} noValidate>
      <div className="aa-form-grid">
        <label>
          Name
          <input value={f.name} onChange={set("name")} required maxLength={80} autoComplete="name" />
        </label>
        <label>
          Work email
          <input type="email" value={f.email} onChange={set("email")} required maxLength={160} autoComplete="email" />
        </label>
        <label>
          <span>
            Company <span className="aa-opt">(optional)</span>
          </span>
          <input value={f.company} onChange={set("company")} maxLength={120} autoComplete="organization" />
        </label>
        <label className="aa-hp" aria-hidden="true">
          Website
          <input tabIndex={-1} value={f.website} onChange={set("website")} autoComplete="off" />
        </label>
      </div>
      <label>
        What agent do you need?
        <textarea
          value={f.need}
          onChange={set("need")}
          required
          maxLength={2000}
          rows={4}
          placeholder={`For example: ${agentName} that replies to enquiries and drafts follow-ups for approval.`}
        />
      </label>
      <label className="aa-check">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          You can email me about this request. See our <a href="/privacy">privacy policy</a>.
        </span>
      </label>
      {error ? (
        <p className="aa-err" role="alert">
          {error}
        </p>
      ) : null}
      <button className="btn btn-p" type="submit" disabled={busy}>
        {busy ? "Sending…" : "Send my request"}
      </button>
    </form>
  );
}
