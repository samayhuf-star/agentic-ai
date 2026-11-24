"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, type DragEndEvent, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripIcon, PinIcon, SendIcon } from "@/components/icons";
import { useAfterMount, usePublishDetail } from "@/components/layout/context";
import { composerState, groupChatAgents, shouldSendOnEnter } from "@/lib/chat-view";

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
  onPin,
}: {
  agent: AgentOption;
  selected: boolean;
  onSelect: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
}) {
  const ready = useAfterMount();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: agent.id });
  const style = ready ? { transform: CSS.Transform.toString(transform), transition } : undefined;
  return (
    <div ref={setNodeRef} style={style} className={["chat-row", selected ? "on" : "", agent.needsYou ? "needs-you" : ""].filter(Boolean).join(" ")}>
      <button className="grip" type="button" aria-label={`Move ${agent.name}`} {...(ready ? attributes : {})} {...(ready ? listeners : {})}>
        <GripIcon />
      </button>
      <button type="button" className="chat-person" onClick={() => onSelect(agent.id)}>
        <span className="avatar" style={{ background: agent.color }}>
          {agent.name.slice(0, 1)}
        </span>
        <span className="chat-person-text">
          <b title={agent.name}>{agent.name}</b>
          <span className="muted" title={agent.role}>
            {agent.role}
          </span>
          {agent.needsYou ? (
            <span className="needs-flag">
              <span className="needs-dot" aria-hidden="true" />
              Needs you{agent.needsCount > 1 ? ` · ${agent.needsCount}` : ""}
            </span>
          ) : null}
        </span>
      </button>
      <button
        className={agent.pinned ? "pin-mini on" : "pin-mini"}
        type="button"
        aria-label={agent.pinned ? `Unpin ${agent.name}` : `Pin ${agent.name}`}
        aria-pressed={agent.pinned}
        onClick={() => onPin(agent.id, !agent.pinned)}
      >
        <PinIcon filled={agent.pinned} />
      </button>
    </div>
  );
}

export function ChatWorkspace({
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
  const [query, setQuery] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const active = rows.find((agent) => agent.id === selectedId);
  const grouped = groupChatAgents(rows, query);
  const sendState = composerState({ text, busy, hasKey });

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

  async function pin(id: string, nextPinned: boolean) {
    setRows((current) => current.map((agent) => (agent.id === id ? { ...agent, pinned: nextPinned } : agent)));
    const response = await fetch("/api/dashboard/agents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentId: id, pinned: nextPinned }),
    });
    if (!response.ok) setRows((current) => current.map((agent) => (agent.id === id ? { ...agent, pinned: !nextPinned } : agent)));
  }

  async function reorder(groupPinned: boolean, groupRows: AgentOption[], event: DragEndEvent) {
    const { active: dragged, over } = event;
    if (!over || dragged.id === over.id) return;
    const oldIndex = groupRows.findIndex((agent) => agent.id === dragged.id);
    const newIndex = groupRows.findIndex((agent) => agent.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const nextGroup = arrayMove(groupRows, oldIndex, newIndex);
    const movingNeeds = groupRows.some((agent) => agent.needsYou);
    setRows((current) => {
      const pinnedRows = groupPinned ? nextGroup : current.filter((agent) => agent.pinned);
      const needsRows = !groupPinned && movingNeeds ? nextGroup : current.filter((agent) => !agent.pinned && agent.needsYou);
      const restRows = !groupPinned && !movingNeeds ? nextGroup : current.filter((agent) => !agent.pinned && !agent.needsYou);
      return [...pinnedRows, ...needsRows, ...restRows];
    });
    await fetch("/api/dashboard/agents/reorder", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pinned: groupPinned, ids: nextGroup.map((agent) => agent.id) }),
    });
  }

  async function send(event?: React.FormEvent) {
    event?.preventDefault();
    const value = text.trim();
    if (!hasKey || busy || !value || !active) return;
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

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (shouldSendOnEnter(event.key, event.shiftKey)) {
      event.preventDefault();
      if (!sendState.disabled) void send();
    }
  }

  function group(title: string, groupRows: AgentOption[], groupPinned: boolean) {
    if (groupRows.length === 0) return null;
    return (
      <div>
        <p className="chat-group">{title}</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => reorder(groupPinned, groupRows, event)}>
          <SortableContext items={groupRows.map((agent) => agent.id)} strategy={verticalListSortingStrategy}>
            {groupRows.map((agent) => (
              <ChatRow key={agent.id} agent={agent} selected={agent.id === selectedId} onSelect={choose} onPin={pin} />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    );
  }

  const thread = (
    <div className="thread">
      <div className="agent-top">
        <span className="avatar" style={{ background: active?.color || "var(--accent, #c8f25a)" }}>
          {active?.name.slice(0, 1)}
        </span>
        <span className="team-id-text">
          <b>{active?.name}</b>
          <small className="muted">{active?.role}</small>
        </span>
      </div>
      {!hasKey ? (
        <div className="connect-card">
          <p>You can read this chat. To send a message, connect a key.</p>
          <Link className="btn btn-p" href="/dashboard/settings">
            Connect AI key
          </Link>
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
      <form className="chat-form preview-compose" onSubmit={send}>
        <textarea
          rows={2}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={hasKey ? "Type a message" : "Connect a key to type"}
          aria-label="Message"
          disabled={!hasKey || busy}
        />
        <button className="send-btn" type="submit" aria-label="Send" disabled={sendState.disabled}>
          <SendIcon />
        </button>
      </form>
      {!hasKey ? (
        <p className="composer-hint">
          The box stays off until you <Link href="/dashboard/settings">connect an AI key</Link>.
        </p>
      ) : null}
    </div>
  );

  usePublishDetail(thread, `${selectedId}:${messages.map((message) => message.id).join(",")}:${text}:${busy}:${error}:${hasKey}`, true);

  const list = (
    <div className={listOpen ? "chat-list open" : "chat-list"} role="listbox" aria-label="Your agents">
      <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or role" aria-label="Search agents" />
      {group("Pinned", grouped.pinned, true)}
      {group("Needs you", grouped.needs, false)}
      {group("Team", grouped.rest, false)}
    </div>
  );

  return (
    <div className="chat preview-chat">
      <button className="btn btn-g chat-picker" type="button" onClick={() => setListOpen((value) => !value)} aria-expanded={listOpen}>
        {listOpen ? "Close agents" : active?.name || "Choose an agent"}
      </button>
      {list}
    </div>
  );
}
