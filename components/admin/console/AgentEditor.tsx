"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Msg, useApi } from "@/components/admin/console/useApi";

type Agent = { id: string; name: string; role: string; blurb: string; color: string };

export function AgentEditor({ agent, readOnly }: { agent: Agent; readOnly: boolean }) {
  const router = useRouter();
  const { busy, message, call } = useApi();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(agent);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const result = await call(`/api/admin/agents/${encodeURIComponent(agent.id)}`, "PATCH", {
      name: values.name,
      role: values.role,
      blurb: values.blurb,
      color: values.color,
    });
    if (result.ok) {
      setOpen(false);
      router.refresh();
    }
  }

  if (!open) {
    return (
      <div>
        <button className="btn btn-g btn-sm" type="button" onClick={() => setOpen(true)} disabled={readOnly}>
          Edit
        </button>
        <Msg message={message} />
      </div>
    );
  }
  return (
    <form onSubmit={save} className="stack" style={{ minWidth: 240 }}>
      <input value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} aria-label="Name" maxLength={60} required />
      <input value={values.role} onChange={(e) => setValues({ ...values, role: e.target.value })} aria-label="Role" maxLength={80} required />
      <textarea rows={3} value={values.blurb} onChange={(e) => setValues({ ...values, blurb: e.target.value })} aria-label="Description" maxLength={600} required />
      <input value={values.color} onChange={(e) => setValues({ ...values, color: e.target.value })} aria-label="Color" pattern="#[0-9a-fA-F]{6}" />
      <div className="row-actions">
        <button className="btn btn-p btn-sm" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </button>
        <button className="btn btn-g btn-sm" type="button" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </button>
      </div>
      <Msg message={message} />
    </form>
  );
}
