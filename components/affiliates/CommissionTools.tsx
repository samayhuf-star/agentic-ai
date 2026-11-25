"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Msg, useApi } from "@/components/admin/console/useApi";

export function CommissionActions({ id, status, readOnly }: { id: string; status: string; readOnly?: boolean }) {
  const router = useRouter();
  const { busy, message, call } = useApi();
  if (readOnly) return null;
  async function run(body: Record<string, unknown>) {
    const r = await call(`/api/admin/commissions/${id}`, "PATCH", body);
    if (r.ok) router.refresh();
  }
  return (
    <div>
      <div className="row-actions">
        {status === "pending" ? (
          <button className="btn btn-g btn-sm" type="button" disabled={busy} onClick={() => run({ action: "approve" })}>
            Approve
          </button>
        ) : null}
        {status === "pending" || status === "approved" ? (
          <>
            <button
              className="btn btn-g btn-sm"
              type="button"
              disabled={busy}
              onClick={() => {
                const ref = window.prompt("Payout reference (UPI txn / UTR):");
                if (ref) run({ action: "pay", payoutRef: ref });
              }}
            >
              Mark paid
            </button>
            <button
              className="btn btn-danger btn-sm"
              type="button"
              disabled={busy}
              onClick={() => {
                const note = window.prompt("Reason for voiding:");
                if (note !== null) run({ action: "void", note });
              }}
            >
              Void
            </button>
          </>
        ) : null}
        {status === "void" ? (
          <button className="btn btn-g btn-sm" type="button" disabled={busy} onClick={() => run({ action: "reopen" })}>
            Reopen
          </button>
        ) : null}
      </div>
      <Msg message={message} />
    </div>
  );
}

export function CommissionBulk({ affiliateId, approvedTotal, pendingCount, readOnly }: { affiliateId: string; approvedTotal: string; pendingCount: number; readOnly?: boolean }) {
  const router = useRouter();
  const { busy, message, call } = useApi();
  const [adj, setAdj] = useState({ amount: "", note: "" });
  const [pay, setPay] = useState({ payoutRef: "", paidAt: "" });
  const url = `/api/admin/affiliates/${affiliateId}/commissions`;
  async function run(body: Record<string, unknown>, reset?: () => void) {
    const r = await call(url, "POST", body);
    if (r.ok) {
      reset?.();
      router.refresh();
    }
  }
  if (readOnly) return null;
  return (
    <div className="adm-cols">
      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          run({ action: "payAll", ...pay }, () => setPay({ payoutRef: "", paidAt: "" }));
        }}
      >
        <h3>Pay out approved ({approvedTotal})</h3>
        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
          <label className="field">
            Payout reference (UPI txn / UTR) *
            <input value={pay.payoutRef} onChange={(e) => setPay({ ...pay, payoutRef: e.target.value })} required maxLength={120} />
          </label>
          <label className="field">
            Paid on (IST)
            <input type="date" value={pay.paidAt} onChange={(e) => setPay({ ...pay, paidAt: e.target.value })} />
          </label>
          <div className="row-actions">
            <button className="btn btn-p btn-sm" type="submit">
              Mark all approved as paid
            </button>
            {pendingCount > 0 ? (
              <button className="btn btn-g btn-sm" type="button" onClick={() => run({ action: "approveAll" })}>
                Approve all {pendingCount} pending
              </button>
            ) : null}
          </div>
        </fieldset>
      </form>
      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          run({ action: "adjustment", ...adj }, () => setAdj({ amount: "", note: "" }));
        }}
      >
        <h3>Manual adjustment</h3>
        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
          <label className="field">
            Amount ₹ (minus to deduct) *
            <input inputMode="numeric" value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: e.target.value })} required placeholder="500 or -200" />
          </label>
          <label className="field">
            Reason *
            <input value={adj.note} onChange={(e) => setAdj({ ...adj, note: e.target.value })} required maxLength={500} placeholder="Bonus for launch reel" />
          </label>
          <button className="btn btn-g btn-sm" type="submit">
            Add adjustment
          </button>
        </fieldset>
      </form>
      <div style={{ gridColumn: "1 / -1" }}>
        <Msg message={message} />
      </div>
    </div>
  );
}
