"use client";

import { useState } from "react";
import { AI_MODELS, AI_PROVIDERS, PROVIDER_HELP, PROVIDER_LABEL, defaultModel, type AiProvider } from "@/lib/ai/models";

export type PublicKey = {
  provider: AiProvider;
  model: string;
  keyLast4: string;
  isValid: boolean;
  lastTestedAt: string | null;
};

export function AiKeyForm({
  initial,
  compact = false,
  onSaved,
}: {
  initial: PublicKey | null;
  compact?: boolean;
  onSaved?: (key: PublicKey | null) => void;
}) {
  const [provider, setProvider] = useState<AiProvider>(initial?.provider || "anthropic");
  const [model, setModel] = useState(initial?.model || defaultModel(initial?.provider || "anthropic"));
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState<PublicKey | null>(initial);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [providerOpen, setProviderOpen] = useState(false);

  function pickProvider(next: AiProvider) {
    setProvider(next);
    setModel(defaultModel(next));
    setProviderOpen(false);
    setMessage("");
    setError("");
  }

  async function testAndSave(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/dashboard/ai-key", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider, model, apiKey }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string; key?: PublicKey };
    setBusy(false);
    if (!response.ok || !data.key) {
      setError(data.message || "That did not work. Try again.");
      return;
    }
    setSaved(data.key);
    setApiKey("");
    setMessage("Key works. Saved.");
    onSaved?.(data.key);
  }

  async function retest() {
    if (!saved) return;
    setBusy(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/dashboard/ai-key/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: saved.provider, model: saved.model }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string; key?: PublicKey };
    setBusy(false);
    if (!response.ok) {
      setError(data.message || "The test did not work.");
      return;
    }
    setMessage("Key works.");
  }

  async function remove() {
    setBusy(true);
    setError("");
    const response = await fetch("/api/dashboard/ai-key", { method: "DELETE" });
    setBusy(false);
    if (!response.ok) {
      setError("The key could not be removed.");
      return;
    }
    setSaved(null);
    setMessage("Key removed.");
    onSaved?.(null);
  }

  return (
    <form className="stack" onSubmit={testAndSave}>
      {saved ? (
        <p className="muted">
          {PROVIDER_LABEL[saved.provider]} · {saved.model} · …{saved.keyLast4} · {saved.isValid ? "Working" : "Not confirmed"}
        </p>
      ) : (
        <p className="muted">No key connected yet.</p>
      )}
      <div className="field">
        <span id="provider-label">Provider</span>
        <button
          className="provider-toggle"
          type="button"
          aria-label={`Provider, ${PROVIDER_LABEL[provider]}`}
          aria-expanded={providerOpen}
          aria-controls="provider-list"
          onClick={() => setProviderOpen((open) => !open)}
        >
          {PROVIDER_LABEL[provider]}
        </button>
        {providerOpen ? (
          <ul className="provider-list" id="provider-list" role="listbox" aria-label="AI provider">
            {AI_PROVIDERS.map((item) => (
              <li key={item}>
                <button type="button" role="option" aria-selected={item === provider} onClick={() => pickProvider(item)}>
                  {PROVIDER_LABEL[item]}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <p className="muted">{PROVIDER_HELP[provider]}</p>
      <label className="field">
        Model
        <select value={model} onChange={(event) => setModel(event.target.value)} aria-label="Model">
          {AI_MODELS[provider].map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
              {item.default ? " (default)" : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        API key
        <input
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder={saved ? "Paste a new key to replace it" : "Paste your key"}
          aria-label="API key"
        />
      </label>
      {error ? <p className="field-error">{error}</p> : null}
      {message ? <p>{message}</p> : null}
      <button className="btn btn-p" type="submit" disabled={busy || apiKey.trim().length < 8}>
        {busy ? "Checking…" : "Test & Save"}
      </button>
      {saved && !compact ? (
        <div className="row-actions">
          <button className="btn btn-g" type="button" onClick={retest} disabled={busy}>
            Re-test
          </button>
          <button className="btn btn-g" type="button" onClick={remove} disabled={busy}>
            Remove key
          </button>
        </div>
      ) : null}
    </form>
  );
}
