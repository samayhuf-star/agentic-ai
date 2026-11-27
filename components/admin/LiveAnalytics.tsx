"use client";

import { useEffect, useState } from "react";
import type { LiveAnalytics as LiveSnapshot, CountRow, RankRow } from "@/lib/admin/live-analytics";

const POLL_MS = 12_000;

function rupees(amount: number) {
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount)}`;
}

function count(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function rate(value: number | null) {
  return value == null ? "—" : `${value}%`;
}

export function LiveAnalytics({ initial, query }: { initial: LiveSnapshot; query: string }) {
  const [data, setData] = useState(initial);
  const [nowTick, setNowTick] = useState(0);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    setData(initial);
  }, [initial]);

  useEffect(() => {
    setNowTick(Date.now());
    const clock = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    let cancel = false;
    const poll = setInterval(async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const response = await fetch(`/api/admin/analytics/live?${query}`, { cache: "no-store" });
        if (!response.ok) {
          if (!cancel) setStale(true);
          return;
        }
        const next = (await response.json()) as LiveSnapshot;
        if (!cancel) {
          setData(next);
          setStale(false);
        }
      } catch {
        if (!cancel) setStale(true);
      }
    }, POLL_MS);
    return () => {
      cancel = true;
      clearInterval(poll);
    };
  }, [query]);

  const seconds = Math.max(0, Math.round((nowTick - Date.parse(data.generatedAt)) / 1000));
  const paid = data.funnel.find((step) => step.label === "Payment success");
  const net = data.revenueInr - data.refundedInr;

  return (
    <div className="live-analytics">
      <section className="adm-section" aria-live="polite">
        <div className="adm-head">
          <h2>Realtime</h2>
          <p className="live-status">
            <span className="live-dot" aria-hidden="true" />
            <span>{stale ? "Showing the last snapshot" : nowTick ? `Updated ${seconds}s ago` : "Live"}</span>
          </p>
        </div>
        <p className="muted">People with a visit, signup, login, checkout or payment in the window. Emails and webhooks are not counted. Times are IST.</p>
        <div className="live-kpis">
          <article className="stat">
            <b>{count(data.realtime.active5)}</b>
            <small>Active 5 min</small>
          </article>
          <article className="stat">
            <b>{count(data.realtime.active30)}</b>
            <small>Active 30 min</small>
          </article>
        </div>
        <CountChart
          points={data.realtime.minutes.map((minute) => ({ label: minute.label, bar: minute.users, line: minute.views }))}
          barName="Active users"
          lineName="Page views"
          summary={`Active users and page views each minute for the last 30 minutes. ${data.realtime.active5} active in 5 minutes, ${data.realtime.active30} active in 30 minutes.`}
        />
      </section>

      <section className="adm-section">
        <h2>Visitors</h2>
        <p className="muted">
          Page views are visit rows. A visitor is the marketing visitor when one was stored, otherwise the customer. A session breaks after 30 quiet minutes.{" "}
          {data.range.bucket === "hour" ? "Each bar is an hour." : "Each bar is a day."}
        </p>
        <div className="live-kpis">
          <article className="stat">
            <b>{count(data.totals.visitors)}</b>
            <small>Visitors</small>
          </article>
          <article className="stat">
            <b>{count(data.totals.sessions)}</b>
            <small>Sessions</small>
          </article>
          <article className="stat">
            <b>{count(data.totals.pageViews)}</b>
            <small>Page views</small>
          </article>
          <article className="stat">
            <b>{rupees(net)}</b>
            <small>{data.refundedInr ? `Revenue after ${rupees(data.refundedInr)} refunded` : "Revenue"}</small>
          </article>
        </div>
        <CountChart
          points={data.series.map((point) => ({ label: point.label, bar: point.pageViews, line: point.visitors }))}
          barName="Page views"
          lineName="Visitors"
          summary={data.series.map((point) => `${point.label}: ${point.pageViews} page views, ${point.visitors} visitors, ${point.sessions} sessions`).join(". ")}
        />
      </section>

      <div className="live-split">
        <RankTable title="Top sources" column="Source" rows={data.sources} empty="No visits in this range." />
        <RankTable title="Top campaigns" column="Campaign" rows={data.campaigns} empty="No campaign was stored on these visits." />
        <RankTable title="Top pages" column="Page" rows={data.pages} empty="No page was stored on these visits." />
        <section className="adm-section">
          <h2>Devices and in-app browsers</h2>
          <p className="muted">In-app prompts store the app. Checkout stores a device. A normal browser visit does not.</p>
          {data.inApp.length === 0 && data.devices.length === 0 ? <p className="muted">Nothing recorded in this range.</p> : null}
          {data.inApp.length ? <CountList caption="In-app browser" rows={data.inApp} /> : null}
          {data.devices.length ? <CountList caption="Device" rows={data.devices} /> : null}
        </section>
      </div>

      <section className="adm-section">
        <h2>Cities</h2>
        <p className="muted">Visits do not record a country. A city is the customer profile linked to a signup, login, checkout or payment in this range.</p>
        {data.cities.length === 0 ? (
          <p className="muted">No city on these events.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>City</th>
                  <th>People</th>
                </tr>
              </thead>
              <tbody>
                {data.cities.map((city) => (
                  <tr key={city.label}>
                    <td>{city.label}</td>
                    <td>{count(city.people)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="adm-section">
        <h2>Funnel</h2>
        <p className="muted">
          Event counts are the Activity log rows for this range. Rates are of visit events. Payment success is {rupees(data.revenueInr)}
          {paid ? ` across ${count(paid.events)} paid ${paid.events === 1 ? "event" : "events"}` : ""}.
          {data.refundedInr ? ` Refunded events sum to ${rupees(data.refundedInr)}.` : ""}
        </p>
        <ol className="live-funnel">
          {data.funnel.map((step) => {
            const width = step.ofVisits == null ? 0 : Math.max(0, Math.min(100, step.ofVisits));
            return (
              <li key={step.label}>
                <div>
                  <b>{step.label}</b>
                  <div className="bar" aria-hidden="true">
                    <span style={{ width: `${step.label === "Visit" ? 100 : width}%` }} />
                  </div>
                </div>
                <span>
                  {count(step.events)} <small>{count(step.people)} {step.people === 1 ? "person" : "people"}</small>
                </span>
                <small>{step.label === "Visit" ? "100%" : `${rate(step.ofVisits)} of visits${step.ofPrevious == null ? "" : ` · ${rate(step.ofPrevious)} of previous`}`}</small>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

function RankTable({ title, column, rows, empty }: { title: string; column: string; rows: RankRow[]; empty: string }) {
  return (
    <section className="adm-section">
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p className="muted">{empty}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{column}</th>
                <th>Views</th>
                <th>Visitors</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>{count(row.pageViews)}</td>
                  <td>{count(row.visitors)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function CountList({ caption, rows }: { caption: string; rows: CountRow[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{caption}</th>
            <th>Events</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${caption}-${row.label}`}>
              <td>
                <span className="pill">{row.label}</span>
              </td>
              <td>{count(row.events)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CountChart({ points, barName, lineName, summary }: { points: { label: string; bar: number; line: number }[]; barName: string; lineName: string; summary: string }) {
  if (points.length === 0) return <p className="muted">No data yet.</p>;
  const width = 720;
  const height = 180;
  const gap = points.length > 40 ? 2 : 4;
  const barWidth = Math.max(2, (width - gap * Math.max(points.length - 1, 0)) / points.length);
  const max = Math.max(...points.map((point) => Math.max(point.bar, point.line)), 1);
  const step = Math.max(1, Math.ceil(points.length / 6));
  const line = points
    .map((point, index) => {
      const x = index * (barWidth + gap) + barWidth / 2;
      const y = height - 18 - (point.line / max) * (height - 36);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <div className="live-chart-wrap">
      <p className="muted">
        <span className="swatch bar" /> {barName} <span className="swatch line" /> {lineName}
      </p>
      <svg className="stats-chart live-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={summary || "Chart"}>
        {points.map((point, index) => {
          const barHeight = (point.bar / max) * (height - 36);
          const x = index * (barWidth + gap);
          return (
            <g key={`${point.label}-${index}`}>
              <title>{`${point.label}: ${barName} ${point.bar}, ${lineName} ${point.line}`}</title>
              <rect x={x} y={height - 18 - barHeight} width={barWidth} height={Math.max(barHeight, 0)} rx="2" fill="#c8f25a" />
            </g>
          );
        })}
        <polyline points={line} fill="none" stroke="#ffc94d" strokeWidth="2" />
      </svg>
      <div className="chart-axis live-axis">
        {points.map((point, index) => (
          <span key={`${point.label}-${index}`}>{index % step === 0 || index === points.length - 1 ? point.label : ""}</span>
        ))}
      </div>
    </div>
  );
}
