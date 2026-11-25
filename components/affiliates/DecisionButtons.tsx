"use client";

import { useRouter } from "next/navigation";
import { Msg, useApi } from "@/components/admin/console/useApi";

export function DecisionButtons({ id, status, canResend, readOnly }: { id: string; status: string; canResend: boolean; readOnly?: boolean }) {
  const router = useRouter();
  const { busy, message, call } = useApi();
  if (readOnly) return null;
  const url = `/api/admin/affiliates/${id}`;
  async function run(body: Record<string, unknown>) {
    await call(url, "PATCH", body);
    router.refresh();
  }
  return (
    <div>
      <div className="row-actions">
        {status !== "active" && status !== "paused" ? (
          <button className="btn btn-p btn-sm" type="button" disabled={busy} onClick={() => run({ action: "approve" })}>
            Approve
          </button>
        ) : null}
        {status === "pending" ? (
          <button
            className="btn btn-danger btn-sm"
            type="button"
            disabled={busy}
            onClick={() => {
              const reason = window.prompt("Reject this application? Optional reason (sent to the applicant):", "");
              if (reason !== null) run({ action: "reject", reason });
            }}
          >
            Reject
          </button>
        ) : null}
        {canResend ? (
          <button className="btn btn-g btn-sm" type="button" disabled={busy} onClick={() => run({ action: "resendEmail" })}>
            Resend email
          </button>
        ) : null}
      </div>
      <Msg message={message} />
    </div>
  );
}
