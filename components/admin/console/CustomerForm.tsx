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

export type CustomerValues = {
  id?: string;
  name: string;
  email: string;
  phone: string;
  businessName: string;
  notes: string;
  compAccess?: boolean;
  marketingOptOut?: boolean;
  paused?: boolean;
};

export function CustomerForm({
  mode,
  initial,
  defaultAmount = 1999,
  readOnly = false,
}: {
  mode: "create" | "edit";
  initial: CustomerValues;
  defaultAmount?: number;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const { busy, message, call } = useApi();
  const [values, setValues] = useState(initial);
  const [access, setAccess] = useState("paid");
  const [status, setStatus] = useState("active");
  const [amount, setAmount] = useState(String(defaultAmount));
  const [method, setMethod] = useState("upi");
  const [reference, setReference] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [isTest, setIsTest] = useState(false);

  function set<K extends keyof CustomerValues>(key: K, value: CustomerValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (readOnly) return;
    if (mode === "create") {
      const result = await call("/api/admin/customers", "POST", {
        ...values,
        access,
        status,
        amount,
        method,
        reference,
        paidAt,
        isTest,
      });
      if (result.ok && typeof result.data.id === "string") {
        router.push(`/sup-admin/customers/${result.data.id}`);
        router.refresh();
      }
    } else {
      const result = await call(`/api/admin/customers/${values.id}`, "PATCH", {
        name: values.name,
        email: values.email,
        phone: values.phone,
        businessName: values.businessName,
        notes: values.notes,
        compAccess: Boolean(values.compAccess),
        marketingOptOut: Boolean(values.marketingOptOut),
        paused: Boolean(values.paused),
      });
      if (result.ok) router.refresh();
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <fieldset disabled={readOnly || busy} style={{ border: 0, padding: 0, margin: 0 }}>
        <div className="adm-grid">
          <label className="field">
            Full name{mode === "create" ? " *" : ""}
            <input value={values.name} onChange={(e) => set("name", e.target.value)} maxLength={80} required={mode === "create"} />
          </label>
          <label className="field">
            Email *
            <input type="email" value={values.email} onChange={(e) => set("email", e.target.value)} maxLength={200} required={mode === "create"} />
          </label>
          <label className="field">
            Mobile (India)
            <input inputMode="tel" value={values.phone} onChange={(e) => set("phone", e.target.value)} placeholder="98xxxxxxxx" />
          </label>
          <label className="field">
            Business name
            <input value={values.businessName} onChange={(e) => set("businessName", e.target.value)} maxLength={120} />
          </label>

          {mode === "create" ? (
            <>
              <label className="field">
                Plan / access
                <select value={access} onChange={(e) => setAccess(e.target.value)}>
                  <option value="paid">Paid: lifetime access (records a manual payment)</option>
                  <option value="comp">Free access (no payment)</option>
                  <option value="none">No access yet (add a payment later)</option>
                </select>
              </label>
              <label className="field">
                Status
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </label>
              {access === "paid" ? (
                <>
                  <label className="field">
                    Amount (₹)
                    <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                  </label>
                  <label className="field">
                    Method
                    <select value={method} onChange={(e) => setMethod(e.target.value)}>
                      {METHODS.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    Reference (UTR / txn ID)
                    <input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} />
                  </label>
                  <label className="field">
                    Payment date
                    <input type="datetime-local" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
                  </label>
                  <label className="check full">
                    <input type="checkbox" checked={isTest} onChange={(e) => setIsTest(e.target.checked)} /> Test payment (kept out of revenue)
                  </label>
                </>
              ) : null}
            </>
          ) : (
            <div className="full stack">
              <label className="check">
                <input type="checkbox" checked={Boolean(values.compAccess)} onChange={(e) => set("compAccess", e.target.checked)} /> Free access (no payment needed)
              </label>
              <label className="check">
                <input type="checkbox" checked={Boolean(values.paused)} onChange={(e) => set("paused", e.target.checked)} /> Team paused
              </label>
              <label className="check">
                <input type="checkbox" checked={Boolean(values.marketingOptOut)} onChange={(e) => set("marketingOptOut", e.target.checked)} /> Opted out of marketing email
              </label>
            </div>
          )}
          <label className="field full">
            Internal notes (only admins see these)
            <textarea rows={3} value={values.notes} onChange={(e) => set("notes", e.target.value)} maxLength={2000} />
          </label>
        </div>
        <div className="row-actions" style={{ marginTop: 14 }}>
          <button className="btn btn-p btn-sm" type="submit">
            {busy ? "Saving…" : mode === "create" ? "Create customer" : "Save changes"}
          </button>
        </div>
        <Msg message={message} />
      </fieldset>
    </form>
  );
}
