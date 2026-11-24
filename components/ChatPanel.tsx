"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

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
  const [selectedId, setSelectedId] = useState(activeId);
  const [messages, setMessages] = useState(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const active = agents.find((agent) => agent.id === selectedId);

  useEffect(() => {
    const fromUrl = params.get("agent");
    if (fromUrl && agents.some((agent) => agent.id === fromUrl)) setSelectedId(fromUrl);
  }, [params, agents]);

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

  return (
    <div className="chat">
      <button className="btn btn-g chat-picker" type="button" onClick={() => setListOpen((open) => !open)} aria-expanded={listOpen}>
        {listOpen ? "Close agents" : `${active?.name || "Choose an agent"}`}
      </button>
      <div className={listOpen ? "chat-list open" : "chat-list"} role="listbox" aria-label="Your agents">
        {agents.map((agent) => (
          <button
            key={agent.id}
            type="button"
            className={[agent.id === active?.id ? "on" : "", agent.needsYou ? "needs-you" : ""].filter(Boolean).join(" ")}
            onClick={() => {
              setSelectedId(agent.id);
              setListOpen(false);
              router.push(`/dashboard/chat?agent=${agent.id}`);
            }}
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
        ))}
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
        <div className="thread-log">
          {messages.length === 0 ? <p className="muted">Say hello. Talk like you would to a person.</p> : null}
          {messages.map((message) => (
            <p key={message.id} className={message.role === "user" ? "bubble user" : "bubble agent"}>
              {message.body}
            </p>
          ))}
          {error ? <p className="error">{error}</p> : null}
        </div>
        <form className="chat-form" onSubmit={send}>
          <input type="text" value={text} onChange={(event) => setText(event.target.value)} placeholder="Type anything, like you'd text a person…" aria-label="Message" disabled={!hasKey} />
          <button className="btn btn-p" type="submit" disabled={busy || !hasKey}>
            {busy ? "Sending…" : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
