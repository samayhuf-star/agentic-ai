import { formatIstSeconds, type PaymentJourney } from "@/lib/admin/journey";

export function JourneySection({ journey }: { journey: PaymentJourney }) {
  return (
    <section className="adm-section journey-section">
      <h2>Journey</h2>
      <p className="journey-stop">{journey.stopPoint}</p>
      {journey.claritySessionId ? (
        <p className="muted">
          Clarity session {journey.claritySessionId}
          {journey.clarityUrl ? (
            <>
              {" "}
              · <a href={journey.clarityUrl} target="_blank" rel="noreferrer">Open replay</a>
            </>
          ) : (
            " · add NEXT_PUBLIC_CLARITY_ID to link the replay"
          )}
        </p>
      ) : (
        <p className="muted">No Clarity recording yet. Recordings start after the Clarity project id is set, on the landing, checkout and payment-return pages only.</p>
      )}
      {journey.cashfreeStatus ? <p className="muted">Live Cashfree order status: {journey.cashfreeStatus}</p> : null}
      {journey.events.length === 0 ? (
        <p className="muted">No events recorded for this payment yet.</p>
      ) : (
        <ol className="journey">
          {journey.events.map((row, index) => (
            <li key={`${row.type}-${row.at.toISOString()}-${index}`} className={`journey-item${row.source === "cashfree" ? " is-live" : ""}`}>
              <time dateTime={row.at.toISOString()}>{formatIstSeconds(row.at)}</time>
              <div>
                <strong>{row.title}</strong>
                {row.status ? <span className="pill">{row.status}</span> : null}
                {row.detail ? <p className="muted">{row.detail}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
