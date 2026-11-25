"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Msg, useApi } from "@/components/admin/console/useApi";

const METHODS: [string, string][] = [
  ["upi", "UPI"],
  ["bank_transfer", "Bank transfer"],
  ["cash", "Cash"],
  ["card", "Card"],
  ["cashfree", "Cashfree"],
  ["razorpay", "Razorpay"],
  ["payu", "PayU"],
  ["other", "Other"],
];
const STATUSES: [string, string][] = [
  ["paid", "Paid (gives lifetime access)"],
  ["pending", "Pending"],
  ["failed", "Failed"],
  ["refunded", "Refunded (removes access if it was the only payment)"],
];

export type PaymentValues = {
  id?: string;
  customerEmail: string;
  amount: string;
  status: string;
  method: string;
  reference: string;
  note: string;
  paidAt: string;
  isTest: boolean;
  manual?: boolean;
};

export function PaymentForm({ mode, initial, readOnly = false }: { mode: "create" | "edit"; initial: PaymentValues; readOnly?: boolean }) {
  const router = useRouter();
  const { busy, message, call } = useApi();
  const [values, setValues] = useState(initial);
  const amountLocked = mode === "edit" && !initial.manual;

  function set<K extends keyof PaymentValues>(key: K, value: PaymentValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (readOnly) return;
    const body: Record<string, unknown> = {
      status: values.status,
      method: values.method,
      reference: values.reference,
      note: values.note,
      isTest: values.isTest,
      paidAt: values.paidAt,
    };
    if (!amountLocked) body.amount = values.amount;
    if (mode === "create") {
      const result = await call("/api/admin/payments", "POST", { ...body, customerEmail: values.customerEmail });
      if (result.ok && typeof result.data.id === "string") {
        router.push(`/sup-admin/payments/${result.data.id}`);
        router.refresh();
      }
    } else {
      if (values.customerEmail && values.customerEmail !== initial.customerEmail) body.customerEmail = values.customerEmail;
      const result = await call(`/api/admin/payments/${encodeURIComponent(values.id!)}`, "PATCH", body);
      if (result.ok) router.refresh();
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <fieldset disabled={readOnly || busy} style={{ border: 0, padding: 0, margin: 0 }}>
        <div className="adm-grid">
          <label className="field full">
            Customer email{mode === "create" ? " *" : " (change to move this payment)"}
            <input type="email" value={values.customerEmail} onChange={(e) => set("customerEmail", e.target.value)} required={mode === "create"} />
          </label>
          <label className="field">
            Amount (₹){amountLocked ? " (set by the gateway)" : ""}
            <input inputMode="numeric" value={values.amount} onChange={(e) => set("amount", e.target.value)} disabled={amountLocked} required />
          </label>
          <label className="field">
            Status
            <select value={values.status} onChange={(e) => set("status", e.target.value)}>
              {STATUSES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
              {STATUSES.some(([value]) => value === values.status) ? null : <option value={values.status}>{values.status}</option>}
            </select>
          </label>
          <label className="field">
            Method
            <select value={values.method} onChange={(e) => set("method", e.target.value)}>
              {METHODS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Reference (UTR / txn ID)
            <input value={values.reference} onChange={(e) => set("reference", e.target.value)} maxLength={120} />
          </label>
          <label className="field">
            Payment date
            <input type="datetime-local" value={values.paidAt} onChange={(e) => set("paidAt", e.target.value)} />
          </label>
          <label className="check" style={{ alignSelf: "end" }}>
            <input type="checkbox" checked={values.isTest} onChange={(e) => set("isTest", e.target.checked)} /> Test payment (kept out of revenue)
          </label>
          <label className="field full">
            Note
            <textarea rows={2} value={values.note} onChange={(e) => set("note", e.target.value)} maxLength={1000} />
          </label>
        </div>
        <div className="row-actions" style={{ marginTop: 14 }}>
          <button className="btn btn-p btn-sm" type="submit">
            {busy ? "Saving…" : mode === "create" ? "Record payment" : "Save changes"}
          </button>
        </div>
        <Msg message={message} />
      </fieldset>
    </form>
  );
}
