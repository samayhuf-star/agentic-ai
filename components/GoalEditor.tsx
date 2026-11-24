"use client";

import { useState } from "react";
import { GOALS } from "@/data/agents";

export function GoalEditor({ goal }: { goal: string }) {
  const [value, setValue] = useState(goal);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/dashboard/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ goal: value }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    setBusy(false);
    setMessage(response.ok ? "Goal saved. Your on and off choices stay as they are." : data.message || "Could not save.");
  }

  return (
    <form className="stack" onSubmit={save}>
      <h2 style={{ fontSize: 28 }}>Main goal</h2>
      <p className="goal-help">This only updates who is marked as picked for you.</p>
      <fieldset className="choices" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="sr-only">Main goal</legend>
        {GOALS.map((item) => (
          <label key={item.id} className={value === item.id ? "onboard-choice on" : "onboard-choice"}>
            <input type="radio" name="goal" value={item.id} checked={value === item.id} onChange={() => setValue(item.id)} />
            {item.label}
          </label>
        ))}
      </fieldset>
      {message ? <p>{message}</p> : null}
      <button className="btn btn-p" type="submit" disabled={busy || !value}>
        {busy ? "Saving…" : "Save goal"}
      </button>
    </form>
  );
}
