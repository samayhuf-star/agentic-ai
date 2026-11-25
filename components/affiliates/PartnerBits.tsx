import type { FeedItem } from "@/lib/affiliates/dashboard";
import { formatIst } from "@/lib/config";

export function StatusBanner({ status }: { status: string }) {
  if (status === "pending")
    return (
      <div className="aff-review" role="status">
        <b>Under review.</b> We check every application by hand, usually within 2 working days. Your link starts tracking once you&apos;re approved, and this page fills
        up then.
      </div>
    );
  if (status === "rejected")
    return (
      <div className="aff-alert" role="status">
        <b>Not approved.</b> This application wasn&apos;t approved, so the link does not track. Questions? Reply to our email.
      </div>
    );
  if (status === "paused")
    return (
      <div className="aff-review" role="status">
        <b>Paused.</b> New clicks are not tracked right now. Commission you already earned is safe.
      </div>
    );
  return null;
}

export function Feed({ items }: { items: FeedItem[] }) {
  if (items.length === 0) return <p className="muted">No sales yet. They show here as they happen.</p>;
  return (
    <ul className="aff-feed">
      {items.map((i) => (
        <li key={i.id}>
          <span>
            <b>
              {i.who}
              {i.city ? `, ${i.city}` : ""}
            </b>{" "}
            — {i.sale} — <span className={i.tone}>{i.commission}</span>
          </span>
          <small className="muted">{formatIst(i.when)}</small>
        </li>
      ))}
    </ul>
  );
}

export function Stat({ label, value, sub, big }: { label: string; value: string; sub?: string; big?: boolean }) {
  return (
    <div className={`stat${big ? " big y" : ""}`}>
      <small>{label}</small>
      <b>{value}</b>
      {sub ? <span className="muted">{sub}</span> : null}
    </div>
  );
}

export const inr = (n: number) => `₹${new Intl.NumberFormat("en-IN").format(n)}`;
export const num = (n: number) => new Intl.NumberFormat("en-IN").format(n);
