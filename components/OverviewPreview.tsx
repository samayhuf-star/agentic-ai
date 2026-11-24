"use client";

import { PauseSwitch } from "@/components/PauseSwitch";
import { usePublishDetail } from "@/components/layout/context";

export function OverviewPreview({
  businessName,
  goal,
  paused,
  active,
  waiting,
  doneToday,
  recent,
}: {
  businessName: string;
  goal: string;
  paused: boolean;
  active: number;
  waiting: number;
  doneToday: number;
  recent: { id: string; title: string }[];
}) {
  usePublishDetail(
    <div className="detail-card">
      <p className="br-kicker">{businessName}</p>
      <strong>{active} on</strong>
      <p>{waiting > 0 ? `${waiting} thing${waiting === 1 ? "" : "s"} need your yes.` : "Nothing is waiting on you."}</p>
      <p className="muted">Goal: {goal}. {doneToday} approved today. Nothing goes live until you say yes.</p>
    </div>,
    `${active}:${waiting}:${doneToday}:${goal}`,
    true,
  );

  return (
    <div className="dense-overview">
      <p className="br-kicker">{businessName}</p>
      <h1>Good to see you.</h1>
      <p className="muted">Goal: {goal}. Nothing goes live until you say yes.</p>
      {paused ? <div className="banner">Paused. No posts, no messages, no spending.</div> : null}
      <div className="dense-stats">
        <div>
          <small>Switched on</small>
          <b>{active}</b>
        </div>
        <div>
          <small>Needs yes</small>
          <b>{waiting}</b>
        </div>
        <div>
          <small>Approved today</small>
          <b>{doneToday}</b>
        </div>
      </div>
      <ul className="dense-list">
        {recent.length === 0 ? <li>Nothing finished yet.</li> : recent.map((task) => <li key={task.id}>{task.title}</li>)}
      </ul>
      <PauseSwitch key={`overview-${String(paused)}`} initial={paused} />
    </div>
  );
}
