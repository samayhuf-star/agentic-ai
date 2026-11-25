"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Msg, useApi } from "@/components/admin/console/useApi";

type Props = {
  url: string;
  method: "POST" | "PATCH" | "DELETE";
  body?: Record<string, unknown>;
  label: string;
  confirmTitle?: string;
  confirmText?: string;
  typeToConfirm?: string;
  danger?: boolean;
  redirectTo?: string;
  readOnly?: boolean;
};

export function ActionButton({ url, method, body, label, confirmTitle, confirmText, typeToConfirm, danger, redirectTo, readOnly }: Props) {
  const router = useRouter();
  const { busy, message, call } = useApi();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const needsConfirm = Boolean(confirmTitle || typeToConfirm);

  async function run() {
    const payload = typeToConfirm ? { ...(body || {}), confirm: typed } : body;
    const result = await call(url, method, payload);
    if (result.ok) {
      setOpen(false);
      setTyped("");
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    }
  }

  const cls = `btn btn-sm ${danger ? "btn-danger" : "btn-g"}`;
  return (
    <div>
      <button className={cls} type="button" disabled={busy || readOnly} onClick={() => (needsConfirm ? setOpen(true) : run())}>
        {busy ? "Working…" : label}
      </button>
      {!open ? <Msg message={message} /> : null}
      {open ? (
        <div className="confirm-layer" role="presentation">
          <div className="confirm-card" role="dialog" aria-modal="true" aria-label={confirmTitle || label}>
            <h2>{confirmTitle || `${label}?`}</h2>
            {confirmText ? <p>{confirmText}</p> : null}
            {typeToConfirm ? (
              <label className="field">
                Type <b style={{ color: "var(--text)" }}>{typeToConfirm}</b> to confirm
                <input value={typed} onChange={(event) => setTyped(event.target.value)} autoFocus autoComplete="off" />
              </label>
            ) : null}
            <Msg message={message} />
            <div className="row-actions" style={{ marginTop: 12 }}>
              <button
                className={cls}
                type="button"
                onClick={run}
                disabled={busy || (Boolean(typeToConfirm) && typed.trim().toLowerCase() !== typeToConfirm!.toLowerCase())}
              >
                {busy ? "Working…" : label}
              </button>
              <button className="btn btn-sm btn-g" type="button" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
