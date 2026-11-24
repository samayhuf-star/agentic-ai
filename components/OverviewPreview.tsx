"use client";

import { useState } from "react";
import { PauseSwitch } from "@/components/PauseSwitch";
import { usePublishDetail } from "@/components/layout/context";
import type { PreviewLayout } from "@/lib/preview-layout";

type Item = { id: string; title: string; detail: string };

export function OverviewPreview({
  layout,
  businessName,
  goal,
  paused,
  active,
  waiting,
  doneToday,
  recent,
}: {
  layout: PreviewLayout;
  businessName: string;
  goal: string;
  paused: boolean;
  active: number;
  waiting: number;
  doneToday: number;
  recent: { id: string; title: string }[];
}) {
  const items: Item[] = [
    { id: "on", title: "Switched on", detail: `${active} agents are on.` },
    { id: "yes", title: "Needs yes", detail: waiting > 0 ? `${waiting} thing${waiting === 1 ? "" : "s"} need your yes.` : "Nothing is waiting on you." },
    { id: "today", title: "Approved today", detail: `${doneToday} approved today.` },
    ...recent.map((task) => ({ id: task.id, title: task.title, detail: "This stays in your yes decisions." })),
  ];
  const [selectedId, setSelectedId] = useState(items[0]?.id || "on");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  usePublishDetail(
    <div className="detail-card">
      <p className="br-kicker">{businessName}</p>
      <strong>{selected?.title}</strong>
      <p>{selected?.detail}</p>
      <p className="muted">Goal: {goal}. Nothing goes live until you say yes.</p>
    </div>,
    `${selectedId}:${active}:${waiting}:${doneToday}`,
    layout === "c",
  );

  if (layout === "b") {
    return (
      <div className="split-inbox">
        <div className="split-list" role="listbox" aria-label="Overview">
          {items.map((item) => (
            <button key={item.id} type="button" className={item.id === selected?.id ? "on" : ""} onClick={() => setSelectedId(item.id)}>
              <b>{item.title}</b>
            </button>
          ))}
        </div>
        <div className="split-detail">
          <p className="br-kicker">{businessName}</p>
          <h1>{selected?.title}</h1>
          <p>{selected?.detail}</p>
          <p className="muted">Goal: {goal}. Nothing goes live until you say yes.</p>
          {paused ? <div className="banner">Paused. No posts, no messages, no spending.</div> : null}
          {recent.length === 0 ? <p className="muted">Nothing finished yet. Your team waits for your yes before anything goes out.</p> : null}
        </div>
      </div>
    );
  }

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
