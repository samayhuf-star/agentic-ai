"use client";

import { useState } from "react";

export function SettingsForm({ businessName, sells, email, phone }: { businessName: string; sells: string; email: string; phone: string }) {
  const [name, setName] = useState(businessName);
  const [what, setWhat] = useState(sells);
  const [message, setMessage] = useState("");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/dashboard/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ businessName: name, sells: what }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    setMessage(response.ok ? "Saved." : data.message || "Could not save.");
  }

  return (
    <form className="stack" onSubmit={save}>
      <label className="field">
        Business name
        <input value={name} onChange={(event) => setName(event.target.value)} required />
      </label>
      <label className="field">
        What you sell
        <input value={what} onChange={(event) => setWhat(event.target.value)} required />
      </label>
      <p className="muted">Email: {email || "Not added yet"}</p>
      <p className="muted">Phone: {phone}</p>
      {message ? <p>{message}</p> : null}
      <button className="btn btn-p" type="submit">
        Save
      </button>
    </form>
  );
}
