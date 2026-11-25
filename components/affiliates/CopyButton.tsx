"use client";

import { useState } from "react";

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const area = document.createElement("textarea");
      area.value = value;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 1600);
  }
  return (
    <button type="button" className="btn btn-g btn-sm aff-copy" onClick={copy} aria-live="polite">
      {done ? "Copied ✓" : label}
    </button>
  );
}

export function LinkRow({ label, url }: { label: string; url: string }) {
  return (
    <div className="aff-link">
      <small>{label}</small>
      <div className="aff-link-row">
        <code>{url}</code>
        <CopyButton value={url} />
      </div>
    </div>
  );
}
