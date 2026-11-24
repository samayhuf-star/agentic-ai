"use client";

import { ChatWorkspace } from "@/components/ChatWorkspace";

export function ChatPanel(props: React.ComponentProps<typeof ChatWorkspace>) {
  return <ChatWorkspace {...props} />;
}
