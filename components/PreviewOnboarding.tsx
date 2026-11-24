"use client";

import { useState } from "react";
import { GOALS } from "@/data/agents";
import { keyStatusCopy } from "@/lib/ai/models";
import { AiKeyForm, type PublicKey } from "@/components/AiKeyForm";
import { BusinessPicker, type PickerValue } from "@/components/BusinessPicker";
import { validateBusinessSelection } from "@/lib/business-profile";

type Picked = { id: string; name: string; role: string; department: string; color: string };

export function PreviewOnboarding() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [businessName, setBusinessName] = useState("");
  const [picker, setPicker] = useState<PickerValue>({ category: "", businessType: "", customType: "" });
  const [goal, setGoal] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [team, setTeam] = useState<Picked[]>([]);
  const [key, setKey] = useState<PublicKey | null>(null);
  const nameOk = businessName.trim().length >= 2;
  const goalOk = GOALS.some((item) => item.id === goal);
  const business = validateBusinessSelection(picker);

  async function saveBusiness(event: React.FormEvent) {
    event.preventDefault();
    if (!nameOk || !goalOk || !business.ok) {
      setError(!business.ok ? business.message : "Add the business name and pick a goal.");
      return;
    }
    setBusy(true);
    setError("");
    const response = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        businessName,
        goal,
        category: picker.category,
        businessType: picker.businessType,
        customType: picker.customType,
      }),
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
    setStep(3);
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
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          if (!nameOk || !goalOk) {
            setError("Add the business name and pick a goal.");
            return;
          }
          setError("");
          setStep(2);
        }}
      >
        <p className="br-kicker">Step 1 of 4</p>
        <h1>About your business</h1>
        <label className="field">
          Business name
          <input type="text" name="business-name" autoComplete="organization" value={businessName} onChange={(event) => setBusinessName(event.target.value)} maxLength={80} />
        </label>
        <fieldset className="choices" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend>Main goal</legend>
          {GOALS.map((item) => (
            <label key={item.id} className={goal === item.id ? "onboard-choice on" : "onboard-choice"}>
              <input type="radio" name="goal" value={item.id} checked={goal === item.id} onChange={() => setGoal(item.id)} />
              {item.label}
            </label>
          ))}
        </fieldset>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn btn-p" type="submit" disabled={!nameOk || !goalOk}>
          Continue
        </button>
      </form>
    );
  }

  if (step === 2) {
    return (
      <form className="stack" onSubmit={saveBusiness}>
        <p className="br-kicker">Step 2 of 4</p>
        <h1>Category</h1>
        <p className="lead">Pick a category, then the kind of business.</p>
        <BusinessPicker value={picker} onChange={setPicker} />
        {error ? <p className="error">{error}</p> : null}
        <div className="row-actions">
          <button className="btn btn-g" type="button" onClick={() => setStep(1)}>
            Back
          </button>
          <button className="btn btn-p" type="submit" disabled={busy || !business.ok}>
            {busy ? "Saving…" : "Continue"}
          </button>
        </div>
      </form>
    );
  }

  if (step === 3) {
    return (
      <div className="stack">
        <p className="br-kicker">Step 3 of 4</p>
        <h1>Connect your AI</h1>
        <p className="lead">Paste your own key. We test it before saving. You can skip and add it later in Settings.</p>
        <AiKeyForm initial={key} compact onSaved={(next) => setKey(next)} />
        <button className="btn btn-g skip-later" type="button" onClick={() => setStep(4)}>
          Skip for now (connect later in Settings)
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="br-kicker">Step 4 of 4</p>
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
