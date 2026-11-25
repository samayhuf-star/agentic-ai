import { describeTouch } from "@/lib/marketing/server";

export function AttributionCard({
  first,
  last,
  channelFirst,
  channelLast,
  note,
}: {
  first: unknown;
  last: unknown;
  channelFirst: string | null;
  channelLast: string | null;
  note?: React.ReactNode;
}) {
  const f = describeTouch(first);
  const l = describeTouch(last);
  return (
    <section className="adm-section card">
      <h2>Attribution</h2>
      {note ? <p className="muted">{note}</p> : null}
      {!f && !l ? (
        <p className="muted">No marketing data recorded{channelLast ? ` (channel: ${channelLast})` : ""}.</p>
      ) : (
        <div className="adm-cols">
          {[
            ["First touch", channelFirst, f],
            ["Last touch", channelLast, l],
          ].map(([label, channel, rows]) => (
            <div key={label as string}>
              <h3>
                {label as string}: <span className="pill">{(channel as string) || "Direct"}</span>
              </h3>
              <dl className="adm-dl">
                {((rows as [string, string][] | null) || []).map(([k, v]) => (
                  <div key={k} style={{ display: "contents" }}>
                    <dt>{k}</dt>
                    <dd style={{ wordBreak: "break-all" }}>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
