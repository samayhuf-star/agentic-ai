"use client";

import { useState } from "react";

type DayPoint = { day: string; revenue: number; orders: number };

function rupees(amount: number) {
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount)}`;
}

function dayLabel(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function RevenueChart({ days }: { days: DayPoint[] }) {
  const [picked, setPicked] = useState<number | null>(null);
  if (days.length === 0) return <p className="muted">No data yet.</p>;
  const max = Math.max(...days.map((day) => day.revenue), 1);
  const maxOrders = Math.max(...days.map((day) => day.orders), 1);
  const peak = days.reduce((best, day) => (day.revenue > best.revenue ? day : best), days[0]);
  const width = 640;
  const height = 200;
  const gap = 6;
  const barWidth = Math.max(4, (width - gap * (days.length - 1)) / days.length);
  const step = Math.max(1, Math.ceil(days.length / 4));
  const active = days.filter((day) => day.orders > 0 || day.revenue > 0);
  const caption = active.map((day) => `${dayLabel(day.day)} gross ${rupees(day.revenue)}, ${day.orders} ${day.orders === 1 ? "order" : "orders"}`).join(". ");
  const points = days
    .map((day, index) => {
      const x = index * (barWidth + gap) + barWidth / 2;
      const y = height - 16 - (day.orders / maxOrders) * (height - 36);
      return `${x},${y}`;
    })
    .join(" ");
  const selected = picked == null ? peak : days[picked];
  const summary = `${caption}. Bars are gross paid and include orders later marked refunded. Days are India time.`;
  return (
    <div>
      <p className="muted">Highest {dayLabel(peak.day)}: gross {rupees(peak.revenue)}.</p>
      <p className="chart-caption">{caption}</p>
      <p className="muted">
        {dayLabel(selected.day)} · gross {rupees(selected.revenue)} · {selected.orders} {selected.orders === 1 ? "order" : "orders"}
      </p>
      <svg className="stats-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={summary}>
        {days.map((day, index) => {
          const barHeight = (day.revenue / max) * (height - 36);
          const x = index * (barWidth + gap);
          return (
            <g key={day.day} onClick={() => setPicked(index)}>
              <title>{`${dayLabel(day.day)}: gross ${rupees(day.revenue)}, ${day.orders} orders`}</title>
              <rect x={x} y={height - 16 - barHeight} width={barWidth} height={Math.max(barHeight, 0)} rx="3" fill={picked === index ? "#e7ff9a" : "#c8f25a"} />
            </g>
          );
        })}
        <polyline points={points} fill="none" stroke="#ffc94d" strokeWidth="2" />
      </svg>
      <div className="chart-axis">
        {days.map((day, index) => {
          const activeDay = day.orders > 0 || day.revenue > 0;
          const major = activeDay || index % step === 0 || index === days.length - 1;
          return (
            <span className={major ? "tick tick-major" : "tick"} key={day.day}>
              {major ? dayLabel(day.day) : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}
