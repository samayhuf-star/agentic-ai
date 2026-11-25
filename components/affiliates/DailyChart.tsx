import type { DayPoint } from "@/lib/affiliates/stats";

/** Server-rendered bar chart: bars = clicks, dots = paid sales. */
export function DailyChart({ points }: { points: DayPoint[] }) {
  const w = 720;
  const h = 180;
  const pad = 24;
  const maxClicks = Math.max(1, ...points.map((p) => p.clicks));
  const maxPaid = Math.max(1, ...points.map((p) => p.paid));
  const step = (w - pad * 2) / Math.max(1, points.length);
  const bar = Math.max(2, step * 0.65);
  const totalClicks = points.reduce((s, p) => s + p.clicks, 0);
  const totalPaid = points.reduce((s, p) => s + p.paid, 0);
  const label = (day: string) => {
    const [, m, d] = day.split("-");
    return `${Number(d)}/${Number(m)}`;
  };
  const ticks = points.filter((_, i) => i === 0 || i === points.length - 1 || i % Math.ceil(points.length / 6) === 0);
  return (
    <figure className="aff-chart">
      <svg viewBox={`0 0 ${w} ${h + 22}`} role="img" aria-label={`Last ${points.length} days: ${totalClicks} clicks, ${totalPaid} paid sales`}>
        <line x1={pad} x2={w - pad} y1={h} y2={h} stroke="rgba(255,255,255,0.15)" />
        {points.map((p, i) => {
          const x = pad + i * step + (step - bar) / 2;
          const bh = (p.clicks / maxClicks) * (h - 30);
          const cy = h - 8 - (p.paid / maxPaid) * (h - 40);
          return (
            <g key={p.day}>
              <title>{`${p.day}: ${p.clicks} clicks, ${p.paid} paid`}</title>
              <rect x={x} y={h - bh} width={bar} height={bh} rx={2} fill="rgba(200,242,90,0.35)" />
              {p.paid > 0 ? <circle cx={x + bar / 2} cy={cy} r={4} fill="#ffc94d" /> : null}
            </g>
          );
        })}
        {ticks.map((p) => {
          const i = points.indexOf(p);
          return (
            <text key={p.day} x={pad + i * step + step / 2} y={h + 16} fontSize="11" fill="#88928d" textAnchor="middle">
              {label(p.day)}
            </text>
          );
        })}
      </svg>
      <figcaption className="muted">
        <span className="aff-key aff-key-bar" /> Clicks ({totalClicks}) · <span className="aff-key aff-key-dot" /> Paid sales ({totalPaid}) · India time
      </figcaption>
    </figure>
  );
}
