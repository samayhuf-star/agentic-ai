"use client";

import { useState } from "react";

type Card = {
  id: string;
  name: string;
  role: string;
  department: string;
  blurb: string;
  color: string;
  enabled: boolean;
  recommended: boolean;
};

export function TeamGrid({ cards, paused }: { cards: Card[]; paused: boolean }) {
  const [rows, setRows] = useState(cards);
  const departments = [...new Set(rows.map((row) => row.department))];

  async function toggle(id: string, enabled: boolean) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, enabled } : row)));
    const response = await fetch("/api/dashboard/agents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentId: id, enabled }),
    });
    if (!response.ok) {
      setRows((current) => current.map((row) => (row.id === id ? { ...row, enabled: !enabled } : row)));
    }
  }

  return (
    <div>
      {paused ? <div className="banner">Everything is paused. You can still choose who is on, but nobody works until you turn the switch back on.</div> : null}
      {departments.map((department) => (
        <div className="dept" key={department}>
          <h2>{department}</h2>
          <div className="agent-grid">
            {rows
              .filter((row) => row.department === department)
              .map((row) => (
                <article className="agent-card" key={row.id}>
                  <div className="agent-top">
                    <span className="avatar" style={{ background: row.color }}>
                      {row.name.slice(0, 1)}
                    </span>
                    <span>
                      <b>{row.name}</b>
                      <small className="muted" style={{ display: "block" }}>
                        {row.role}
                      </small>
                    </span>
                  </div>
                  <p>{row.blurb}</p>
                  {row.recommended ? <span className="pill">Picked for you</span> : null}
                  <div style={{ marginTop: 12 }}>
                    <button type="button" className={row.enabled ? "switch on" : "switch"} onClick={() => toggle(row.id, !row.enabled)} aria-pressed={row.enabled}>
                      <i />
                      <span>{row.enabled ? "On" : "Off"}</span>
                    </button>
                  </div>
                </article>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
