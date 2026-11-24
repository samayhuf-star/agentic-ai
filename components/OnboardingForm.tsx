"use client";

import { useState } from "react";
import { GOALS } from "@/data/agents";
import { keyStatusCopy } from "@/lib/ai/models";
import { AiKeyForm, type PublicKey } from "@/components/AiKeyForm";
import { BusinessPicker } from "@/components/dashboard/BusinessPicker";
import { parseBusinessChoice } from "@/lib/business-catalog";
import type { PreviewLayout } from "@/lib/dashboard/preview";

type Picked = { id: string; name: string; role: string; department: string; color: string };

export function OnboardingForm({ layout = null }: { layout?: PreviewLayout | null }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [businessName, setBusinessName] = useState("");
  const [sells, setSells] = useState("");
  const [category, setCategory] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [custom, setCustom] = useState("");
  const [goal, setGoal] = useState("");
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  const [sellsError, setSellsError] = useState("");
  const [goalError, setGoalError] = useState("");
  const [busy, setBusy] = useState(false);
  const [team, setTeam] = useState<Picked[]>([]);
  const [key, setKey] = useState<PublicKey | null>(null);
  const nameOk = businessName.trim().length >= 2;
  const choice = layout ? parseBusinessChoice({ category, businessType, businessCustom: custom }) : null;
  const sellsOk = layout ? Boolean(choice?.ok) : sells.trim().length >= 2;
  const goalOk = GOALS.some((item) => item.id === goal);

  async function saveBusiness(event: React.FormEvent) {
    event.preventDefault();
    setNameError(nameOk ? "" : "Enter the business name.");
    setSellsError(sellsOk ? "" : layout ? choice && !choice.ok ? choice.message : "Pick a category and a business type." : "Say what you sell, in a short line.");
    setGoalError(goalOk ? "" : "Pick one.");
    if (!nameOk || !sellsOk || !goalOk) return;
    setBusy(true);
    setError("");
    const response = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(layout && choice?.ok ? { businessName, goal, category: choice.category, businessType: choice.businessType, businessCustom: choice.businessCustom } : { businessName, sells, goal }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string; team?: Picked[]; redirect?: string; key?: PublicKey | null };
    setBusy(false);
    if (data.redirect) {
      window.location.replace(data.redirect);
      return;
    }
    if (!response.ok || !data.team) {
      setError(data.message || "That did not save. Try again.");
      return;
    }
    setTeam(data.team);
    setKey(data.key || null);
    setStep(2);
  }

  async function finish() {
    setBusy(true);
    const response = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ step: "finish" }),
    });
    const data = (await response.json().catch(() => ({}))) as { redirect?: string; message?: string };
    setBusy(false);
    if (!response.ok) {
      setError(data.message || "That did not finish. Try again.");
      return;
    }
    window.location.replace(data.redirect || "/dashboard");
  }

  if (step === 1) {
    return (
      <form className="stack" onSubmit={saveBusiness} noValidate>
        <p className="br-kicker">Step 1 of 3</p>
        <h1>About your business</h1>
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
        {layout ? (
          <BusinessPicker
            category={category}
            businessType={businessType}
            custom={custom}
            onCategory={(id) => { setCategory(id); setSellsError(""); }}
            onType={(id) => { setBusinessType(id); setSellsError(""); }}
            onCustom={(value) => { setCustom(value); setSellsError(""); }}
          />
        ) : (
          <label className="field">
            What do you sell or do?
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
            />
          </label>
        )}
        {sellsError ? <span className="field-error">{sellsError}</span> : null}
        <fieldset className="choices" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend>Main goal</legend>
          {GOALS.map((item) => (
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
        <button className="btn btn-p" type="submit" disabled={busy || !nameOk || !sellsOk || !goalOk}>
          {busy ? "Saving…" : "Continue"}
        </button>
      </form>
    );
  }

  if (step === 2) {
    return (
      <div className="stack">
        <p className="br-kicker">Step 2 of 3</p>
        <h1>Connect your AI</h1>
        <p className="lead">Paste your own key. We test it before saving. You can skip and add it later in Settings.</p>
        <AiKeyForm
          initial={key}
          compact
          onSaved={(next) => {
            setKey(next);
          }}
        />
        <button className="btn btn-g skip-later" type="button" onClick={() => setStep(3)}>
          Skip for now (connect later in Settings)
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="br-kicker">Step 3 of 3</p>
      <h1>Your team is ready</h1>
      <p className="lead">These are turned on first. The others wait until you switch them on. Nothing goes out until you say yes.</p>
      <p>{key ? `AI key: ${keyStatusCopy(key.provider, key.keyLast4, key.isValid)}` : "AI key: not connected yet. You can add it in Settings."}</p>
      <div className="assemble">
        {team.map((agent) => (
          <div className="ready-row" key={agent.id}>
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
      {error ? <p className="error">{error}</p> : null}
      <p style={{ marginTop: 22 }}>
        <button className="btn btn-p" type="button" onClick={finish} disabled={busy}>
          {busy ? "Opening…" : "Go to dashboard"}
        </button>
      </p>
    </div>
  );
}
