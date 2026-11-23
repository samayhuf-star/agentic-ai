"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AgentOption = { id: string; name: string; role: string; color: string };
type Bubble = { id: string; role: string; body: string };

export function ChatPanel({ agents, activeId, initial }: { agents: AgentOption[]; activeId: string; initial: Bubble[] }) {
  const router = useRouter();
  const [messages, setMessages] = useState(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = agents.find((agent) => agent.id === activeId) ?? agents[0];

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const value = text.trim();
    if (!value || !active) return;
    setText("");
    setBusy(true);
    setError("");
    setMessages((current) => [...current, { id: `local-${Date.now()}`, role: "user", body: value }]);
    const response = await fetch("/api/dashboard/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentId: active.id, text: value }),
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
      <div className="chat-list" role="listbox" aria-label="Your agents">
        {agents.map((agent) => (
          <button key={agent.id} type="button" className={agent.id === active?.id ? "on" : ""} onClick={() => router.push(`/dashboard/chat?agent=${agent.id}`)}>
            <b>{agent.name}</b>
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
        {messages.length === 0 ? <p className="muted">Say hello. Talk like you would to a person.</p> : null}
        {messages.map((message) => (
          <p key={message.id} className={message.role === "user" ? "bubble user" : "bubble agent"}>
            {message.body}
          </p>
        ))}
        {error ? <p className="error">{error}</p> : null}
        <form className="chat-form" onSubmit={send}>
          <input type="text" value={text} onChange={(event) => setText(event.target.value)} placeholder="Type anything, like you'd text a person…" aria-label="Message" />
          <button className="btn btn-p" type="submit" disabled={busy}>
            {busy ? "Sending…" : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
