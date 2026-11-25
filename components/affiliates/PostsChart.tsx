/** Horizontal bars: views per post (top 12). Server-rendered. */
export function PostsChart({ posts }: { posts: { id: string; title: string | null; platform: string; views: number; sales: number }[] }) {
  const top = [...posts].sort((a, b) => b.views - a.views).slice(0, 12);
  if (top.length === 0) return null;
  const max = Math.max(1, ...top.map((p) => p.views));
  return (
    <figure className="aff-chart">
      <div className="aff-funnel">
        {top.map((p) => (
          <div key={p.id} className="aff-funnel-row">
            <span title={p.title || p.platform} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {p.title || `${p.platform} post`}
            </span>
            <div className="aff-funnel-bar" style={{ width: `${Math.max(1, (p.views / max) * 100)}%` }} />
            <span>
              {new Intl.NumberFormat("en-IN", { notation: "compact" }).format(p.views)}
              {p.sales ? <small className="muted"> · {p.sales} sold</small> : null}
            </span>
          </div>
        ))}
      </div>
      <figcaption className="muted">Views per post, most viewed first.</figcaption>
    </figure>
  );
}
