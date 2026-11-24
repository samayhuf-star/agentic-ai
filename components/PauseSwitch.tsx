"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PauseSwitch({ initial, big = false }: { initial: boolean; big?: boolean }) {
  const router = useRouter();
  const [paused, setPaused] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !paused;
    setBusy(true);
    setPaused(next);
    const response = await fetch("/api/dashboard/pause", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ paused: next }),
    });
    setBusy(false);
    if (!response.ok) {
      setPaused(!next);
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={paused}
      className={paused ? "switch on" : "switch"}
      onClick={toggle}
      disabled={busy}
    >
      <i />
      <span>{big ? (paused ? "Everything is paused" : "Pause everything") : paused ? "Paused" : "Running"}</span>
    </button>
  );
}
