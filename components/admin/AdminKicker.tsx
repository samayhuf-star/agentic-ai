export function AdminKicker({ kicker, readOnly = false }: { kicker: string; readOnly?: boolean }) {
  return (
    <div className="title-row">
      <p className="br-kicker">{kicker}</p>
      {readOnly ? <span className="staff-badge">Staff (view only)</span> : null}
    </div>
  );
}
