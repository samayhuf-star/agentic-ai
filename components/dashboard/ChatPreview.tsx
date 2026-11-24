"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, type DragEndEvent, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripIcon, PinIcon, SendIcon } from "@/components/dashboard/icons";
import { composerState, groupChatList } from "@/lib/dashboard/chat-view";

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

function ChatRow({ agent, selected, onSelect, onPin }: { agent: AgentOption; selected: boolean; onSelect: (id: string) => void; onPin: (id: string, pinned: boolean) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: agent.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className={["chat-row", "preview-row", selected ? "on" : "", agent.needsYou ? "needs-you" : ""].filter(Boolean).join(" ")}>
      <button className="grip" type="button" aria-label={`Move ${agent.name}`} {...attributes} {...listeners}>
        <GripIcon />
      </button>
      <button type="button" className="chat-person" onClick={() => onSelect(agent.id)}>
        <span className="avatar" style={{ background: agent.color }}>{agent.name.slice(0, 1)}</span>
        <span className="agent-name">
          <b title={agent.name}>{agent.name}</b>
          <small title={agent.role}>{agent.role}</small>
        </span>
        {agent.needsYou ? <span className="needs-flag"><i />Needs you</span> : null}
      </button>
      <button className="pin-button" type="button" aria-label={agent.pinned ? `Unpin ${agent.name}` : `Pin ${agent.name}`} aria-pressed={agent.pinned} onClick={() => onPin(agent.id, !agent.pinned)}>
        <PinIcon filled={agent.pinned} />
      </button>
    </div>
  );
}

export function ChatPreview({ agents, activeId, initial, hasKey }: { agents: AgentOption[]; activeId: string; initial: Bubble[]; hasKey: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const logRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState(activeId);
  const [rows, setRows] = useState(agents);
  const [messages, setMessages] = useState(initial);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const active = rows.find((agent) => agent.id === selectedId);
  const grouped = groupChatList(rows, query);
  const composer = composerState({ hasKey, text, busy });

  useEffect(() => { setRows(agents); }, [agents]);
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

  async function pin(id: string, nextPinned: boolean) {
    setRows((current) => current.map((agent) => (agent.id === id ? { ...agent, pinned: nextPinned } : agent)));
    const response = await fetch("/api/dashboard/agents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentId: id, pinned: nextPinned }),
    });
    if (!response.ok) setRows((current) => current.map((agent) => (agent.id === id ? { ...agent, pinned: !nextPinned } : agent)));
  }

  async function reorder(groupPinned: boolean, ids: string[], event: DragEndEvent) {
    const { active: dragged, over } = event;
    if (!over || dragged.id === over.id) return;
    const oldIndex = ids.indexOf(String(dragged.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const nextIds = arrayMove(ids, oldIndex, newIndex);
    const pool = rows.filter((agent) => agent.pinned === groupPinned).map((agent) => agent.id);
    const queue = [...nextIds];
    const merged = pool.map((id) => (ids.includes(id) ? queue.shift() || id : id));
    setRows((current) => {
      const byId = new Map(current.map((agent) => [agent.id, agent]));
      const pinnedRows = (groupPinned ? merged : current.filter((agent) => agent.pinned).map((agent) => agent.id)).map((id) => byId.get(id)!);
      const restRows = (groupPinned ? current.filter((agent) => !agent.pinned).map((agent) => agent.id) : merged).map((id) => byId.get(id)!);
      return [...pinnedRows, ...restRows];
    });
    await fetch("/api/dashboard/agents/reorder", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pinned: groupPinned, ids: merged }),
    });
  }

  async function send(event?: React.FormEvent) {
    event?.preventDefault();
    const value = text.trim();
    if (!composer.canSend || !active || !hasKey) return;
    setText("");
    setBusy(true);
    setError("");
    setMessages((current) => [...current, { id: `local-${Date.now()}`, role: "user", body: value }]);
    const response = await fetch("/api/dashboard/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentId: selectedId, text: value }),
    });
    const data = (await response.json().catch(() => ({}))) as { reply?: string; message?: string; needsKey?: boolean };
    setBusy(false);
    if (!response.ok || !data.reply) {
      setError(data.needsKey ? "" : data.message || "The reply did not come through. Try again.");
      return;
    }
    setMessages((current) => [...current, { id: `reply-${Date.now()}`, role: "agent", body: data.reply! }]);
  }

  function section(title: string, group: AgentOption[], groupPinned: boolean) {
    if (group.length === 0) return null;
    return (
      <div>
        <p className="chat-group">{title}</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => reorder(groupPinned, group.map((agent) => agent.id), event)}>
          <SortableContext items={group.map((agent) => agent.id)} strategy={verticalListSortingStrategy}>
            {group.map((agent) => (
              <ChatRow key={agent.id} agent={agent} selected={agent.id === selectedId} onSelect={choose} onPin={pin} />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    );
  }

  return (
    <div className="chat preview-chat">
      <button className="btn btn-g chat-picker" type="button" onClick={() => setListOpen((open) => !open)} aria-expanded={listOpen}>
        {listOpen ? "Close agents" : active?.name || "Choose an agent"}
      </button>
      <div className={listOpen ? "chat-list open" : "chat-list"}>
        <label className="field">
          Search
          <input type="search" value={query} placeholder="Name or role" aria-label="Search agents" onChange={(event) => setQuery(event.target.value)} />
        </label>
        {section("Pinned", grouped.pinned, true)}
        {section("Needs you", grouped.needs, false)}
        {section("Team", grouped.rest, false)}
      </div>
      <div className="thread">
        <div className="agent-top">
          <span className="avatar" style={{ background: active?.color || "#c8f25a" }}>{active?.name.slice(0, 1)}</span>
          <span className="agent-name">
            <b>{active?.name}</b>
            <small title={active?.role}>{active?.role}</small>
          </span>
        </div>
        {!hasKey ? (
          <div className="key-card">
            <p>Connect your AI key before this agent can answer.</p>
            <Link className="btn btn-p" href="/dashboard/settings">Connect AI key</Link>
          </div>
        ) : null}
        <div className="thread-log" ref={logRef}>
          {messages.length === 0 ? <p className="muted">Type a message when you are ready.</p> : null}
          {messages.map((message) => (
            <p key={message.id} className={message.role === "user" ? "bubble user" : "bubble agent"}>{message.body}</p>
          ))}
          {error ? <p className="error">{error}</p> : null}
        </div>
        <form className="chat-form" onSubmit={send}>
          <textarea
            value={text}
            rows={2}
            placeholder={hasKey ? "Type a message" : "Connect your AI key to send a message."}
            aria-label="Message"
            disabled={!hasKey || busy}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
          />
          {composer.hint ? <p className="muted composer-hint">{composer.hint} <Link href="/dashboard/settings">Connect AI key</Link></p> : null}
          <button className="btn btn-p send-icon" type="submit" aria-label="Send" disabled={!composer.canSend}>
            <SendIcon />
          </button>
        </form>
      </div>
    </div>
  );
}
