import type { DayPoint } from "@/lib/admin/stats";

export function RevenueChart({ days }: { days: DayPoint[] }) {
  if (days.length === 0) return <p className="muted">No data yet.</p>;
  const max = Math.max(...days.map((day) => day.revenue), 1);
  const width = 640;
  const height = 160;
  const gap = 6;
  const barWidth = Math.max(4, (width - gap * (days.length - 1)) / days.length);
  const points = days
    .map((day, index) => {
      const x = index * (barWidth + gap) + barWidth / 2;
      const y = height - 24 - (day.orders / Math.max(...days.map((item) => item.orders), 1)) * (height - 36);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg className="stats-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daily revenue and orders">
      {days.map((day, index) => {
        const barHeight = (day.revenue / max) * (height - 36);
        const x = index * (barWidth + gap);
        return <rect key={day.day} x={x} y={height - 24 - barHeight} width={barWidth} height={barHeight} rx="3" fill="#c8f25a" />;
      })}
      <polyline points={points} fill="none" stroke="#ffc94d" strokeWidth="2" />
    </svg>
  );
}
