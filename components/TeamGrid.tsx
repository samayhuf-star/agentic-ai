"use client";

import { TeamBoard } from "@/components/TeamBoard";

export type TeamCard = {
  id: string;
  name: string;
  role: string;
  department: string;
  blurb: string;
  color: string;
  enabled: boolean;
  recommended: boolean;
  pinned: boolean;
  needsYou: boolean;
  needsCount: number;
  needsItems?: string[];
  sortOrder?: number;
};

export function TeamGrid({ cards, paused }: { cards: TeamCard[]; paused: boolean }) {
  return <TeamBoard cards={cards} paused={paused} />;
}
