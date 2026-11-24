export type ChatListAgent = {
  id: string;
  name: string;
  role: string;
  pinned: boolean;
  needsYou: boolean;
};

export function groupChatList<T extends ChatListAgent>(agents: T[], query: string) {
  const needle = query.trim().toLowerCase();
  const matched = agents.filter((agent) => !needle || agent.name.toLowerCase().includes(needle) || agent.role.toLowerCase().includes(needle));
  return {
    pinned: matched.filter((agent) => agent.pinned),
    needs: matched.filter((agent) => !agent.pinned && agent.needsYou),
    rest: matched.filter((agent) => !agent.pinned && !agent.needsYou),
  };
}

export function composerState({ hasKey, text, busy }: { hasKey: boolean; text: string; busy: boolean }) {
  if (!hasKey) return { disabled: true, canSend: false, hint: "Connect your AI key to send a message." };
  if (busy) return { disabled: true, canSend: false, hint: "" };
  if (!text.trim()) return { disabled: true, canSend: false, hint: "" };
  return { disabled: false, canSend: true, hint: "" };
}
