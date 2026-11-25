"use client";

import { useState } from "react";

export type ApiResult = { ok: boolean; status: number; data: Record<string, unknown> };

export function useApi() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  async function call(url: string, method: string, body?: unknown): Promise<ApiResult> {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const text = typeof data.message === "string" ? data.message : response.ok ? "Saved." : "Something went wrong.";
      setMessage({ text, ok: response.ok });
      return { ok: response.ok, status: response.status, data };
    } catch {
      setMessage({ text: "Network error. Try again.", ok: false });
      return { ok: false, status: 0, data: {} };
    } finally {
      setBusy(false);
    }
  }

  return { busy, message, setMessage, call };
}

export function Msg({ message }: { message: { text: string; ok: boolean } | null }) {
  if (!message) return null;
  return (
    <p className={`adm-msg ${message.ok ? "ok" : "err"}`} role={message.ok ? "status" : "alert"}>
      {message.text}
    </p>
  );
}
