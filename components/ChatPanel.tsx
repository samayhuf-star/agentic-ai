"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, type DragEndEvent, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type AgentOption = {
  id: string;
  name: string;
  role: string;
  color: string;
  pinned: boolean;
  needsYou: boolean;
  needsCount: number;
};
type Bubble = { id: string; role: string; body: string };

function ChatRow({
  agent,
  selected,
  onSelect,
}: {
  agent: AgentOption;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: agent.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className={["chat-row", selected ? "on" : "", agent.needsYou ? "needs-you" : ""].filter(Boolean).join(" ")}>
      <button className="drag-handle" type="button" aria-label={`Move ${agent.name}`} {...attributes} {...listeners}>
        Move
      </button>
      <button
        type="button"
        className="chat-person"
        onClick={() => onSelect(agent.id)}
      >
        <b>
          {agent.pinned ? "Pinned · " : ""}
          {agent.name}
        </b>
        {agent.needsCount > 0 ? <span className="needs-badge">{agent.needsCount}</span> : null}
        <span className="muted" style={{ display: "block" }}>
          {agent.role}
        </span>
      </button>
    </div>
  );
}

export function ChatPanel({
  agents,
  activeId,
  initial,
  hasKey,
}: {
  agents: AgentOption[];
  activeId: string;
  initial: Bubble[];
  hasKey: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const logRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState(activeId);
  const [rows, setRows] = useState(agents);
  const [messages, setMessages] = useState(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const active = rows.find((agent) => agent.id === selectedId);
  const pinned = rows.filter((agent) => agent.pinned);
  const rest = rows.filter((agent) => !agent.pinned);

  useEffect(() => {
    setRows(agents);
  }, [agents]);

  useEffect(() => {
    const fromUrl = params.get("agent");
    if (fromUrl && agents.some((agent) => agent.id === fromUrl)) setSelectedId(fromUrl);
  }, [params, agents]);

  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    log.scrollTop = log.scrollHeight;
  }, [messages, listOpen]);

  function choose(id: string) {
    setSelectedId(id);
    setListOpen(false);
    router.push(`/dashboard/chat?agent=${id}`);
  }

  async function reorder(groupPinned: boolean, event: DragEndEvent) {
    const { active: dragged, over } = event;
    if (!over || dragged.id === over.id) return;
    const group = rows.filter((agent) => agent.pinned === groupPinned);
    const oldIndex = group.findIndex((agent) => agent.id === dragged.id);
    const newIndex = group.findIndex((agent) => agent.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const nextGroup = arrayMove(group, oldIndex, newIndex);
    setRows((current) => {
      const pinnedRows = groupPinned ? nextGroup : current.filter((agent) => agent.pinned);
      const restRows = groupPinned ? current.filter((agent) => !agent.pinned) : nextGroup;
      return [...pinnedRows, ...restRows];
    });
    await fetch("/api/dashboard/agents/reorder", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pinned: groupPinned, ids: nextGroup.map((agent) => agent.id) }),
    });
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const value = text.trim();
    if (!value || !active || !hasKey) return;
    setText("");
    setBusy(true);
    setError("");
    setMessages((current) => [...current, { id: `local-${Date.now()}`, role: "user", body: value }]);
    const response = await fetch("/api/dashboard/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentId: selectedId, text: value }),
    });
    const data = (await response.json().catch(() => ({}))) as { reply?: string; message?: string };
    setBusy(false);
    if (!response.ok || !data.reply) {
      setError(data.message || "The reply did not come through. Try again.");
      return;
    }
    setMessages((current) => [...current, { id: `reply-${Date.now()}`, role: "agent", body: data.reply! }]);
  }

  function group(title: string, groupRows: AgentOption[], groupPinned: boolean) {
    if (groupRows.length === 0) return null;
    return (
      <div>
        <p className="chat-group">{title}</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => reorder(groupPinned, event)}>
          <SortableContext items={groupRows.map((agent) => agent.id)} strategy={verticalListSortingStrategy}>
            {groupRows.map((agent) => (
              <ChatRow key={agent.id} agent={agent} selected={agent.id === selectedId} onSelect={choose} />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    );
  }

  return (
    <div className="chat">
      <button className="btn btn-g chat-picker" type="button" onClick={() => setListOpen((open) => !open)} aria-expanded={listOpen}>
        {listOpen ? "Close agents" : `${active?.name || "Choose an agent"}`}
      </button>
      <div className={listOpen ? "chat-list open" : "chat-list"} role="listbox" aria-label="Your agents">
        {group("Pinned", pinned, true)}
        {group("Team", rest, false)}
      </div>
      <div className="thread">
        <div className="agent-top" style={{ marginBottom: 12 }}>
          <span className="avatar" style={{ background: active?.color || "#c8f25a" }}>
            {active?.name.slice(0, 1)}
          </span>
          <span>
            <b>{active?.name}</b>
            <small className="muted" style={{ display: "block" }}>
              {active?.role} · plain words
            </small>
          </span>
        </div>
        {!hasKey ? (
          <div className="banner">
            Connect your AI key in <Link href="/dashboard/settings">Settings</Link> to start chatting.
          </div>
        ) : null}
        <div className="thread-log" ref={logRef}>
          {messages.length === 0 ? <p className="muted">Say hello. Talk like you would to a person.</p> : null}
          {messages.map((message) => (
            <p key={message.id} className={message.role === "user" ? "bubble user" : "bubble agent"}>
              {message.body}
            </p>
          ))}
          {error ? <p className="error">{error}</p> : null}
        </div>
        <form className="chat-form" onSubmit={send}>
          <input type="text" value={text} onChange={(event) => setText(event.target.value)} placeholder="Type a message" aria-label="Message" disabled={!hasKey} />
          <button className="btn btn-p" type="submit" disabled={busy || !hasKey}>
            {busy ? "Sending…" : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
