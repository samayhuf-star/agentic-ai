"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, type DragEndEvent, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripIcon, PinIcon } from "@/components/icons";
import { useAfterMount, usePublishDetail } from "@/components/layout/context";
import type { TeamCard } from "@/components/TeamGrid";
import type { PreviewLayout } from "@/lib/preview-layout";
import { filterTeam, sortTeam, splitTeamGroups, summaryLine, teamSummary, type TeamFilter } from "@/lib/team-view";

const filters: { id: TeamFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "on", label: "On" },
  { id: "picked", label: "Picked for you" },
  { id: "needs", label: "Needs you" },
];

function TeamCardView({
  row,
  selected,
  onSelect,
  onToggle,
  onPin,
}: {
  row: TeamCard;
  selected: boolean;
  onSelect: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onPin: (id: string, pinned: boolean) => void;
}) {
  const ready = useAfterMount();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: row.id });
  const style = ready ? { transform: CSS.Transform.toString(transform), transition } : undefined;
  return (
    <article
      ref={setNodeRef}
      style={style}
      className={["team-card", row.enabled ? "" : "is-off", row.needsYou ? "needs-you" : "", selected ? "is-selected" : ""].filter(Boolean).join(" ")}
      onClick={() => onSelect(row.id)}
    >
      <button className="grip" type="button" aria-label={`Move ${row.name}`} {...(ready ? attributes : {})} {...(ready ? listeners : {})}>
        <GripIcon />
      </button>
      <button
        className={row.pinned ? "pin-corner on" : "pin-corner"}
        type="button"
        aria-label={row.pinned ? `Unpin ${row.name}` : `Pin ${row.name}`}
        aria-pressed={row.pinned}
        onClick={(event) => {
          event.stopPropagation();
          onPin(row.id, !row.pinned);
        }}
      >
        <PinIcon filled={row.pinned} />
      </button>
      <div className="team-id">
        <span className="avatar" style={{ background: row.color }}>
          {row.name.slice(0, 1)}
        </span>
        <span className="team-id-text">
          <b className="team-name" title={row.name}>
            {row.name}
          </b>
          <small className="team-role" title={row.role}>
            {row.role}
          </small>
        </span>
      </div>
      {row.needsYou ? (
        <span className="needs-flag">
          <span className="needs-dot" aria-hidden="true" />
          Needs you
        </span>
      ) : null}
      <p className="blurb">{row.blurb}</p>
      {row.recommended ? <span className="pill">Picked for you</span> : null}
      <div className="team-card-foot">
        <button
          type="button"
          className={row.enabled ? "switch on" : "switch"}
          onClick={(event) => {
            event.stopPropagation();
            onToggle(row.id, !row.enabled);
          }}
          aria-pressed={row.enabled}
        >
          <i />
          <span>{row.enabled ? "On" : "Off"}</span>
        </button>
      </div>
    </article>
  );
}

export function TeamBoard({ cards, paused, layout }: { cards: TeamCard[]; paused: boolean; layout: PreviewLayout }) {
  const [rows, setRows] = useState(cards);
  const [filter, setFilter] = useState<TeamFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(cards.find((card) => card.pinned)?.id || cards[0]?.id || "");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const summary = summaryLine(teamSummary(rows));
  const visible = useMemo(() => sortTeam(filterTeam(rows, filter, query)), [rows, filter, query]);
  const groups = splitTeamGroups(visible);
  const selected = rows.find((row) => row.id === selectedId) || visible[0] || null;

  usePublishDetail(
    selected ? (
      <div className="detail-card">
        <p className="br-kicker">{selected.department}</p>
        <strong>{selected.name}</strong>
        <p>{selected.role}</p>
        <p className="muted">{selected.blurb}</p>
        {selected.needsYou ? <p className="needs-flag">Needs you</p> : null}
      </div>
    ) : null,
    selected ? `${selected.id}:${selected.enabled}:${selected.pinned}:${selected.needsYou}` : "none",
    layout === "c",
  );

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

  async function reorder(group: TeamCard[], event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = group.findIndex((row) => row.id === active.id);
    const newIndex = group.findIndex((row) => row.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const nextGroup = arrayMove(group, oldIndex, newIndex).map((row, index) => ({ ...row, sortOrder: index }));
    const pinnedGroup = group[0]?.pinned ?? false;
    setRows((current) => {
      const order = new Map(nextGroup.map((row) => [row.id, row.sortOrder]));
      return current.map((row) => (order.has(row.id) ? { ...row, sortOrder: order.get(row.id) || 0 } : row));
    });
    await fetch("/api/dashboard/agents/reorder", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pinned: pinnedGroup, ids: nextGroup.map((row) => row.id) }),
    });
  }

  function section(title: string, group: TeamCard[]) {
    if (group.length === 0) return null;
    return (
      <section className="team-section">
        {layout === "b" ? null : <h2>{title}</h2>}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => reorder(group, event)}>
          <SortableContext items={group.map((row) => row.id)} strategy={rectSortingStrategy}>
            <div className="agent-grid team-grid">
              {group.map((row) => (
                <TeamCardView key={row.id} row={row} selected={row.id === selected?.id} onSelect={setSelectedId} onToggle={toggle} onPin={pin} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </section>
    );
  }

  const board = (
    <div className="team-board">
      {paused ? <div className="banner">Everything is paused. You can still choose who is on, but nobody works until you turn the switch back on.</div> : null}
      <div className="team-toolbar">
        <p className="team-count">{summary}</p>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or role" aria-label="Search agents" />
        <div className="filter-chips" role="toolbar" aria-label="Filter agents">
          {filters.map((item) => (
            <button key={item.id} type="button" className={filter === item.id ? "on" : ""} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {visible.length === 0 ? <p className="muted">No agents match.</p> : null}
      {section("Pinned", groups.pinned)}
      {section("On", groups.on)}
      {section("Off", groups.off)}
    </div>
  );

  if (layout === "b") {
    return (
      <div className="split-inbox team-workspace">
        <div className="split-list">{board}</div>
        <div className="split-detail">
          {selected ? (
            <div className="agent-detail">
              <div className="team-id">
                <span className="avatar" style={{ background: selected.color }}>
                  {selected.name.slice(0, 1)}
                </span>
                <span className="team-id-text">
                  <b className="team-name">{selected.name}</b>
                  <small className="team-role">{selected.role}</small>
                </span>
              </div>
              <p className="muted">{selected.department}</p>
              <p className="blurb">{selected.blurb}</p>
              {selected.recommended ? <span className="pill">Picked for you</span> : null}
              <div className="detail-actions">
                <button type="button" className={selected.enabled ? "switch on" : "switch"} onClick={() => toggle(selected.id, !selected.enabled)} aria-pressed={selected.enabled}>
                  <i />
                  <span>{selected.enabled ? "On" : "Off"}</span>
                </button>
                <button className={selected.pinned ? "pin-corner on" : "pin-corner"} type="button" aria-label={selected.pinned ? `Unpin ${selected.name}` : `Pin ${selected.name}`} aria-pressed={selected.pinned} onClick={() => pin(selected.id, !selected.pinned)}>
                  <PinIcon filled={selected.pinned} />
                </button>
              </div>
              {selected.needsItems && selected.needsItems.length > 0 ? (
                <div>
                  <p className="needs-flag">
                    <span className="needs-dot" aria-hidden="true" />
                    Needs you
                  </p>
                  <ul className="needs-list">
                    {selected.needsItems.map((item, index) => (
                      <li key={`${index}-${item}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <Link className="btn btn-p" href={`/dashboard/chat?agent=${selected.id}&layout=b`}>
                Talk to this agent
              </Link>
            </div>
          ) : (
            <p className="muted">Pick someone from the list.</p>
          )}
        </div>
      </div>
    );
  }

  return <div className="team-workspace">{board}</div>;
}
