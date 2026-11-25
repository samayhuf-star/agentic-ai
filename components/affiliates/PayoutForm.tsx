"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Msg, useApi } from "@/components/admin/console/useApi";

export type PayoutFields = {
  upiId: string;
  upiIdConfirm: string;
  holderName: string;
  bankAccount: string;
  bankAccountConfirm: string;
  bankIfsc: string;
  bankName: string;
};

export const EMPTY_PAYOUT: PayoutFields = { upiId: "", upiIdConfirm: "", holderName: "", bankAccount: "", bankAccountConfirm: "", bankIfsc: "", bankName: "" };

export function PayoutFieldsInputs({ values, onChange }: { values: PayoutFields; onChange: (v: PayoutFields) => void }) {
  const set = (key: keyof PayoutFields) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...values, [key]: e.target.value });
  const noPaste = (e: React.ClipboardEvent) => e.preventDefault();
  return (
    <div className="adm-grid">
      <label className="field">
        UPI ID
        <input value={values.upiId} onChange={set("upiId")} placeholder="name@okaxis" autoComplete="off" spellCheck={false} maxLength={120} />
      </label>
      <label className="field">
        Confirm UPI ID
        <input value={values.upiIdConfirm} onChange={set("upiIdConfirm")} onPaste={noPaste} autoComplete="off" spellCheck={false} maxLength={120} />
      </label>
      <label className="field">
        Account holder name
        <input value={values.holderName} onChange={set("holderName")} autoComplete="name" maxLength={80} />
      </label>
      <label className="field">
        Bank name (optional)
        <input value={values.bankName} onChange={set("bankName")} maxLength={80} />
      </label>
      <label className="field">
        Account number (optional)
        <input value={values.bankAccount} onChange={set("bankAccount")} inputMode="numeric" autoComplete="off" maxLength={24} />
      </label>
      <label className="field">
        Confirm account number
        <input value={values.bankAccountConfirm} onChange={set("bankAccountConfirm")} onPaste={noPaste} inputMode="numeric" autoComplete="off" maxLength={24} />
      </label>
      <label className="field">
        IFSC (with account number)
        <input value={values.bankIfsc} onChange={(e) => onChange({ ...values, bankIfsc: e.target.value.toUpperCase() })} placeholder="HDFC0001234" maxLength={11} autoComplete="off" />
      </label>
    </div>
  );
}

export function PayoutForm({ url, method, current, readOnly }: { url: string; method: "PUT" | "PATCH"; current?: string | null; readOnly?: boolean }) {
  const router = useRouter();
  const { busy, message, call } = useApi();
  const [open, setOpen] = useState(!current);
  const [values, setValues] = useState(EMPTY_PAYOUT);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = await call(url, method, method === "PATCH" ? { action: "payout", ...values } : values);
    if (result.ok) {
      setValues(EMPTY_PAYOUT);
      setOpen(false);
      router.refresh();
    }
  }
  return (
    <div>
      {current ? (
        <p>
          <b>On file:</b> {current}
        </p>
      ) : null}
      {!open ? (
        <>
          <Msg message={message} />
          <button className="btn btn-g btn-sm" type="button" onClick={() => setOpen(true)} disabled={readOnly}>
            {current ? "Change payout details" : "Add payout details"}
          </button>
        </>
      ) : (
        <form onSubmit={submit}>
          <fieldset disabled={busy || readOnly} style={{ border: 0, padding: 0, margin: 0 }}>
            <PayoutFieldsInputs values={values} onChange={setValues} />
            <small className="muted">Add a UPI ID, a bank account, or both. Type the confirm fields; pasting is off so typos get caught.</small>
            <Msg message={message} />
            <div className="row-actions" style={{ marginTop: 10 }}>
              <button className="btn btn-p btn-sm" type="submit">
                {busy ? "Saving…" : "Save payout details"}
              </button>
              {current ? (
                <button className="btn btn-g btn-sm" type="button" onClick={() => setOpen(false)}>
                  Cancel
                </button>
              ) : null}
            </div>
          </fieldset>
        </form>
      )}
    </div>
  );
}
