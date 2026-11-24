"use client";

import { useState } from "react";
import { TeamPreview } from "@/components/dashboard/TeamPreview";
import type { PreviewLayout } from "@/lib/dashboard/preview";
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, type DragEndEvent, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type TeamCard = {
  id: string;
  name: string;
  role: string;
  department: string;
  blurb: string;
  color: string;
  enabled: boolean;
  recommended: boolean;
  pinned: boolean;
  needsYou: boolean;
  needsCount: number;
};

function SortableCard({
  row,
  onToggle,
  onPin,
}: {
  row: TeamCard;
  onToggle: (id: string, enabled: boolean) => void;
  onPin: (id: string, pinned: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: row.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <article ref={setNodeRef} style={style} className={row.needsYou ? "agent-card needs-you" : "agent-card"}>
      <div className="agent-top">
        <button className="btn btn-g drag-handle" type="button" aria-label={`Move ${row.name}`} {...attributes} {...listeners}>
          Move
        </button>
        <span className="avatar" style={{ background: row.color }}>
          {row.name.slice(0, 1)}
        </span>
        <span>
          <b>{row.name}</b>
          <small className="muted" style={{ display: "block" }}>
            {row.role}
          </small>
        </span>
        {row.needsCount > 0 ? <span className="needs-badge">{row.needsCount}</span> : null}
      </div>
      <p>{row.blurb}</p>
      {row.recommended ? <span className="pill">Picked for you</span> : null}
      <div className="row-actions" style={{ marginTop: 12 }}>
        <button type="button" className={row.enabled ? "switch on" : "switch"} onClick={() => onToggle(row.id, !row.enabled)} aria-pressed={row.enabled}>
          <i />
          <span>{row.enabled ? "On" : "Off"}</span>
        </button>
        <button className="btn btn-g" type="button" onClick={() => onPin(row.id, !row.pinned)}>
          {row.pinned ? "Unpin" : "Pin"}
        </button>
      </div>
    </article>
  );
}

export function TeamGrid({ cards, paused, layout = null }: { cards: TeamCard[]; paused: boolean; layout?: PreviewLayout | null }) {
  if (layout) return <TeamPreview cards={cards} paused={paused} layout={layout} />;
  return <ClassicTeamGrid cards={cards} paused={paused} />;
}

function ClassicTeamGrid({ cards, paused }: { cards: TeamCard[]; paused: boolean }) {
  const [rows, setRows] = useState(cards);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const pinned = rows.filter((row) => row.pinned);
  const rest = rows.filter((row) => !row.pinned);

  async function toggle(id: string, enabled: boolean) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, enabled } : row)));
    const response = await fetch("/api/dashboard/agents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentId: id, enabled }),
    });
    if (!response.ok) setRows((current) => current.map((row) => (row.id === id ? { ...row, enabled: !enabled } : row)));
  }

  async function pin(id: string, nextPinned: boolean) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, pinned: nextPinned } : row)));
    const response = await fetch("/api/dashboard/agents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentId: id, pinned: nextPinned }),
    });
    if (!response.ok) setRows((current) => current.map((row) => (row.id === id ? { ...row, pinned: !nextPinned } : row)));
  }

  async function reorder(groupPinned: boolean, event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const group = rows.filter((row) => row.pinned === groupPinned);
    const oldIndex = group.findIndex((row) => row.id === active.id);
    const newIndex = group.findIndex((row) => row.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const nextGroup = arrayMove(group, oldIndex, newIndex);
    setRows((current) => {
      let index = 0;
      return current.map((row) => {
        if (row.pinned !== groupPinned) return row;
        const next = nextGroup[index];
        index += 1;
        return next;
      });
    });
    await fetch("/api/dashboard/agents/reorder", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pinned: groupPinned, ids: nextGroup.map((row) => row.id) }),
    });
  }

  function section(title: string, group: TeamCard[], groupPinned: boolean) {
    if (group.length === 0) return null;
    return (
      <section>
        <h2>{title}</h2>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => reorder(groupPinned, event)}>
          <SortableContext items={group.map((row) => row.id)} strategy={rectSortingStrategy}>
            <div className="agent-grid">
              {group.map((row) => (
                <SortableCard key={row.id} row={row} onToggle={toggle} onPin={pin} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </section>
    );
  }

  return (
    <div>
      {paused ? <div className="banner">Everything is paused. You can still choose who is on, but nobody works until you turn the switch back on.</div> : null}
      {section("Pinned", pinned, true)}
      {section("All agents", rest, false)}
    </div>
  );
}
