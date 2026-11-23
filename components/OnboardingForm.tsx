"use client";

import { useState } from "react";
import Link from "next/link";

const CHOICES = [
  { id: "customers", label: "Talk to customers" },
  { id: "replies", label: "Answer messages" },
  { id: "posts", label: "Write posts" },
  { id: "books", label: "Keep the books tidy" },
  { id: "everything", label: "A bit of everything" },
] as const;

type Picked = { id: string; name: string; role: string; department: string; color: string };

export function OnboardingForm() {
  const [businessName, setBusinessName] = useState("");
  const [sells, setSells] = useState("");
  const [goal, setGoal] = useState("");
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  const [sellsError, setSellsError] = useState("");
  const [goalError, setGoalError] = useState("");
  const [busy, setBusy] = useState(false);
  const [team, setTeam] = useState<Picked[] | null>(null);
  const nameOk = businessName.trim().length >= 2;
  const sellsOk = sells.trim().length >= 2;
  const goalOk = CHOICES.some((item) => item.id === goal);
  const valid = nameOk && sellsOk && goalOk;

  function validate() {
    setNameError(nameOk ? "" : "Enter the business name.");
    setSellsError(sellsOk ? "" : "Say what you sell, in a short line.");
    setGoalError(goalOk ? "" : "Pick one.");
    return valid;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    setBusy(true);
    setError("");
    const response = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ businessName, sells, goal }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string; team?: Picked[]; ok?: boolean; redirect?: string };
    if (data.redirect || /already set up/i.test(data.message || "")) {
      window.location.replace(data.redirect || "/dashboard");
      return;
    }
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
        <p className="br-kicker">Ready</p>
        <h1>Your starting team is here.</h1>
        <p className="lead">These are turned on first. The others wait until you switch them on. Nothing goes out until you say yes.</p>
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
    <form className="stack" onSubmit={submit} noValidate>
      <p className="br-kicker">Setup</p>
      <h1>Tell us about the business.</h1>
      <p className="lead">Three answers. We use them to turn on a starting group. You can change this later.</p>
      <label className="field">
        Business name
        <input
          type="text"
          name="business-name"
          autoComplete="organization"
          value={businessName}
          onChange={(event) => {
            setBusinessName(event.target.value);
            if (nameError) setNameError("");
          }}
          maxLength={80}
        />
        {nameError ? <span className="field-error">{nameError}</span> : null}
      </label>
      <label className="field">
        What do you sell?
        <input
          type="text"
          name="sells"
          autoComplete="off"
          value={sells}
          onChange={(event) => {
            setSells(event.target.value);
            if (sellsError) setSellsError("");
          }}
          maxLength={200}
          placeholder="Masala chai and snacks"
        />
        {sellsError ? <span className="field-error">{sellsError}</span> : null}
      </label>
      <fieldset className="choices" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend>What should the team help with?</legend>
        {CHOICES.map((item) => (
          <label key={item.id} className={goal === item.id ? "onboard-choice on" : "onboard-choice"}>
            <input
              type="radio"
              name="goal"
              value={item.id}
              checked={goal === item.id}
              onChange={() => {
                setGoal(item.id);
                setGoalError("");
              }}
            />
            {item.label}
          </label>
        ))}
        {goalError ? <span className="field-error">{goalError}</span> : null}
      </fieldset>
      {error ? <p className="error">{error}</p> : null}
      <button className="btn btn-p" type="submit" disabled={busy || !valid}>
        {busy ? "Saving…" : "Set up my team"}
      </button>
    </form>
  );
}
