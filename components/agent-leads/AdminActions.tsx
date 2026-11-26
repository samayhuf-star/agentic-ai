"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AgentLeadAdminActions({ id, isTest, status }: { id: string; isTest: boolean; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/agent-leads/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) setError(data.message || "Update failed.");
      else router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="row-actions">
      <button className="btn btn-g btn-sm" type="button" disabled={busy} onClick={() => patch({ isTest: !isTest })}>
        {isTest ? "Unmark test" : "Mark as test"}
      </button>
      {status === "new" ? (
        <button className="btn btn-g btn-sm" type="button" disabled={busy} onClick={() => patch({ status: "contacted" })}>
          Mark contacted
        </button>
      ) : (
        <button className="btn btn-g btn-sm" type="button" disabled={busy} onClick={() => patch({ status: "new" })}>
          Mark new
        </button>
      )}
      {status !== "archived" ? (
        <button className="btn btn-g btn-sm" type="button" disabled={busy} onClick={() => patch({ status: "archived" })}>
          Archive
        </button>
      ) : null}
      {error ? <span className="aff-bad">{error}</span> : null}
    </div>
  );
}
