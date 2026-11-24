"use client";

import { useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, type DragEndEvent, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripIcon, PinIcon } from "@/components/dashboard/icons";
import type { PreviewLayout } from "@/lib/dashboard/preview";
import { arrangeTeam, teamGroups, teamSummary, type TeamFilter } from "@/lib/dashboard/team-view";
import type { TeamCard } from "@/components/TeamGrid";

const filters: { id: TeamFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "on", label: "On" },
  { id: "picked", label: "Picked for you" },
  { id: "needs", label: "Needs you" },
];

function CardBody({ row, onToggle, onPin }: { row: TeamCard; onToggle: (id: string, enabled: boolean) => void; onPin: (id: string, pinned: boolean) => void }) {
  return (
    <>
      <button className="pin-button" type="button" aria-label={row.pinned ? `Unpin ${row.name}` : `Pin ${row.name}`} aria-pressed={row.pinned} onClick={() => onPin(row.id, !row.pinned)}>
        <PinIcon filled={row.pinned} />
      </button>
      <div className="agent-id">
        <span className="avatar" style={{ background: row.color }}>{row.name.slice(0, 1)}</span>
        <span className="agent-name">
          <b title={row.name}>{row.name}</b>
          <small title={row.role}>{row.role}</small>
        </span>
      </div>
      <p>{row.blurb}</p>
      <div className="card-flags">
        {row.needsYou ? <span className="needs-flag"><i />Needs you{row.needsCount > 1 ? ` · ${row.needsCount}` : ""}</span> : null}
        {row.recommended ? <span className="pill">Picked for you</span> : null}
      </div>
      <button type="button" className={row.enabled ? "switch on" : "switch"} onClick={() => onToggle(row.id, !row.enabled)} aria-pressed={row.enabled}>
        <i />
        <span>{row.enabled ? "On" : "Off"}</span>
      </button>
    </>
  );
}

function SortableCard({
  row,
  compact,
  onToggle,
  onPin,
  onOpen,
}: {
  row: TeamCard;
  compact?: boolean;
  onToggle: (id: string, enabled: boolean) => void;
  onPin: (id: string, pinned: boolean) => void;
  onOpen?: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: row.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const className = ["agent-card", "preview-card", compact ? "compact" : "", row.needsYou ? "needs-you" : "", row.enabled ? "" : "is-off"].filter(Boolean).join(" ");
  return (
    <article ref={setNodeRef} style={style} className={className} onClick={() => onOpen?.(row.id)}>
      <button className="grip" type="button" aria-label={`Move ${row.name}`} {...attributes} {...listeners}>
        <GripIcon />
      </button>
      {compact ? (
        <div className="agent-id">
          <span className="avatar" style={{ background: row.color }}>{row.name.slice(0, 1)}</span>
          <span className="agent-name">
            <b title={row.name}>{row.name}</b>
            <small title={row.role}>{row.role}</small>
          </span>
          {row.needsYou ? <span className="needs-flag"><i />Needs you</span> : null}
        </div>
      ) : (
        <CardBody row={row} onToggle={onToggle} onPin={onPin} />
      )}
    </article>
  );
}

export function TeamPreview({ cards, paused, layout }: { cards: TeamCard[]; paused: boolean; layout: PreviewLayout }) {
  const [rows, setRows] = useState(cards);
  const [filter, setFilter] = useState<TeamFilter>("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(cards.find((card) => card.pinned)?.id || cards[0]?.id || "");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const summary = teamSummary(rows);
  const arranged = arrangeTeam(rows, filter, query);
  const groups = teamGroups(arranged, filter);
  const open = rows.find((row) => row.id === openId) || arranged[0];

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

  async function reorder(groupPinned: boolean, groupIds: string[], event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = groupIds.indexOf(String(active.id));
    const newIndex = groupIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const nextIds = arrayMove(groupIds, oldIndex, newIndex);
    const full = rows.filter((row) => row.pinned === groupPinned).map((row) => row.id);
    const merged = full.map((id) => (groupIds.includes(id) ? nextIds.shift() || id : id));
    setRows((current) => {
      const pinnedRows = groupPinned ? merged.map((id) => current.find((row) => row.id === id)!) : current.filter((row) => row.pinned);
      const restRows = groupPinned ? current.filter((row) => !row.pinned) : merged.map((id) => current.find((row) => row.id === id)!);
      return [...pinnedRows, ...restRows];
    });
    await fetch("/api/dashboard/agents/reorder", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pinned: groupPinned, ids: merged }),
    });
  }

  function board(strategy: "grid" | "list") {
    return groups.map((group) => (
      <DndContext key={group.key} sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => reorder(group.pinned, group.cards.map((row) => row.id), event)}>
        <SortableContext items={group.cards.map((row) => row.id)} strategy={strategy === "grid" ? rectSortingStrategy : verticalListSortingStrategy}>
          <div className={strategy === "grid" ? "agent-grid" : "agent-list"}>
            {group.cards.map((row) => (
              <SortableCard key={row.id} row={row} compact={strategy === "list"} onToggle={toggle} onPin={pin} onOpen={setOpenId} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    ));
  }

  const tools = (
    <div className="team-tools">
      <p className="team-count">{summary.on} on · {summary.needs} need you</p>
      <div className="chip-row" role="toolbar" aria-label="Filter agents">
        {filters.map((item) => (
          <button key={item.id} type="button" className={filter === item.id ? "chip on" : "chip"} onClick={() => setFilter(item.id)} aria-pressed={filter === item.id}>
            {item.label}
          </button>
        ))}
      </div>
      <label className="field">
        Search
        <input type="search" value={query} placeholder="Name or role" aria-label="Search agents" onChange={(event) => setQuery(event.target.value)} />
      </label>
    </div>
  );

  return (
    <div className={`team-preview layout-${layout}`}>
      {paused ? <div className="banner">Everything is paused. You can still choose who is on, but nobody works until you turn the switch back on.</div> : null}
      {tools}
      {arranged.length === 0 ? <p className="muted">No agents match.</p> : null}
      {layout === "b" ? (
        <div className="split-b">
          <div className="split-menu">{board("list")}</div>
          <div className="split-main">{open ? <CardBody row={open} onToggle={toggle} onPin={pin} /> : null}</div>
        </div>
      ) : (
        <div className={layout === "c" ? "dense-wrap" : ""}>
          <div>{board("grid")}</div>
          {layout === "c" && open ? (
            <aside className="detail-card">
              <p className="br-kicker">Selected</p>
              <CardBody row={open} onToggle={toggle} onPin={pin} />
            </aside>
          ) : null}
        </div>
      )}
    </div>
  );
}
