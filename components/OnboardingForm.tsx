"use client";

import { useState } from "react";
import Link from "next/link";
import { GOALS } from "@/data/agents";

type Picked = { id: string; name: string; role: string; department: string; color: string };

export function OnboardingForm() {
  const [businessName, setBusinessName] = useState("");
  const [sells, setSells] = useState("");
  const [goal, setGoal] = useState("everything");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [team, setTeam] = useState<Picked[] | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ businessName, sells, goal }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string; team?: Picked[] };
    setBusy(false);
    if (!response.ok || !data.team) {
      setError(data.message || "That did not save. Try again.");
      return;
    }
    setTeam(data.team);
  }

  if (team) {
    return (
      <div>
        <p className="br-kicker">Your AI CEO</p>
        <h1>Ayaan is assembling your team.</h1>
        <p className="muted">These are the people he picked first. The other agents are ready whenever you want them.</p>
        <div className="assemble">
          {team.map((agent, index) => (
            <div key={agent.id} style={{ animationDelay: `${index * 70}ms` }}>
              <span className="avatar" style={{ background: agent.color }}>
                {agent.name.slice(0, 1)}
              </span>
              <span>
                <b>{agent.name}</b>
                <span className="muted">
                  {" "}
                  · {agent.role} · {agent.department}
                </span>
              </span>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 22 }}>
          <Link className="btn btn-p" href="/dashboard">
            Open my dashboard
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form className="stack" onSubmit={submit}>
      <p className="br-kicker">About two minutes</p>
      <h1>Tell Ayaan about the business.</h1>
      <p className="muted">Plain answers are enough. He uses them to pick a starting team from the 55 agents.</p>
      <label className="field">
        Business name
        <input value={businessName} onChange={(event) => setBusinessName(event.target.value)} required maxLength={80} />
      </label>
      <label className="field">
        What do you sell?
        <input value={sells} onChange={(event) => setSells(event.target.value)} required maxLength={200} placeholder="Masala chai and snacks" />
      </label>
      <fieldset className="choices" style={{ border: 0, padding: 0 }}>
        <legend className="muted">What do you most want help with?</legend>
        {GOALS.map((item) => (
          <label key={item.id}>
            <input type="radio" name="goal" value={item.id} checked={goal === item.id} onChange={() => setGoal(item.id)} />
            {item.label}
          </label>
        ))}
      </fieldset>
      {error ? <p className="error">{error}</p> : null}
      <button className="btn btn-p" type="submit" disabled={busy}>
        {busy ? "Picking your team…" : "Assemble my team"}
      </button>
    </form>
  );
}
