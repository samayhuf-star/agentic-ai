export type ChatListItem = {
  pinned: boolean;
  needsYou: boolean;
  name: string;
  role: string;
};

export function groupChatAgents<T extends ChatListItem>(agents: T[], query: string) {
  const needle = query.trim().toLowerCase();
  const rows = agents.filter((agent) => !needle || agent.name.toLowerCase().includes(needle) || agent.role.toLowerCase().includes(needle));
  return {
    pinned: rows.filter((agent) => agent.pinned),
    needs: rows.filter((agent) => !agent.pinned && agent.needsYou),
    rest: rows.filter((agent) => !agent.pinned && !agent.needsYou),
  };
}

export function chatHasUsableKey(personal: boolean, platformConfigured: boolean) {
  return personal || platformConfigured;
}

export function composerState({ text, busy, hasKey }: { text: string; busy: boolean; hasKey: boolean }) {
  if (!hasKey) return { disabled: true, reason: "nokey" as const };
  if (busy) return { disabled: true, reason: "busy" as const };
  if (text.trim().length === 0) return { disabled: true, reason: "empty" as const };
  return { disabled: false, reason: "ready" as const };
}

export function shouldSendOnEnter(key: string, shiftKey: boolean) {
  return key === "Enter" && !shiftKey;
}

export function messagesAfterSend<T extends { role: string; body: string }>(messages: T[], text: string, hasKey: boolean) {
  if (!hasKey) return messages;
  const value = text.trim();
  if (!value) return messages;
  return [...messages, { role: "user", body: value } as T];
}
