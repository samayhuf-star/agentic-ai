"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Item = { id: string; title: string; detail: string; agent: string; role: string };

export function YesQueue({ items }: { items: Item[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(items);
  const [note, setNote] = useState("");

  async function decide(id: string, decision: "approved" | "rejected") {
    const response = await fetch("/api/dashboard/approvals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, decision }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    if (!response.ok) {
      setNote(data.message || "That did not save.");
      return;
    }
    setRows((current) => current.filter((row) => row.id !== id));
    setNote(data.message || "Saved.");
    router.refresh();
  }

  if (rows.length === 0) {
    return <p className="muted">Nothing is waiting. Your team will ask before anything goes out.</p>;
  }

  return (
    <div className="stack">
      {note ? <p>{note}</p> : null}
      {rows.map((item) => (
        <article className="yes-card" key={item.id}>
          <small>
            {item.agent} · {item.role}
          </small>
          <h3>{item.title}</h3>
          <p className="muted">{item.detail}</p>
          <div className="row-actions">
            <button className="btn btn-p" type="button" onClick={() => decide(item.id, "approved")}>
              Yes, approve
            </button>
            <button className="btn btn-g" type="button" onClick={() => decide(item.id, "rejected")}>
              Not now
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
