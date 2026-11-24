export type TeamFilter = "all" | "on" | "picked" | "needs";

export type TeamSortable = {
  pinned: boolean;
  enabled: boolean;
  sortOrder?: number;
};

export function teamGroup(card: { pinned: boolean; enabled: boolean }) {
  if (card.pinned) return 0;
  if (card.enabled) return 1;
  return 2;
}

export function sortTeam<T extends TeamSortable>(cards: T[]) {
  return [...cards].sort((a, b) => teamGroup(a) - teamGroup(b) || (a.sortOrder || 0) - (b.sortOrder || 0));
}

export function filterTeam<T extends { name: string; role: string; enabled: boolean; recommended: boolean; needsYou: boolean }>(
  cards: T[],
  filter: TeamFilter,
  query: string,
) {
  const needle = query.trim().toLowerCase();
  return cards.filter((card) => {
    if (filter === "on" && !card.enabled) return false;
    if (filter === "picked" && !card.recommended) return false;
    if (filter === "needs" && !card.needsYou) return false;
    if (!needle) return true;
    return card.name.toLowerCase().includes(needle) || card.role.toLowerCase().includes(needle);
  });
}

export function teamSummary(cards: { enabled: boolean; needsYou: boolean }[]) {
  return {
    on: cards.filter((card) => card.enabled).length,
    needs: cards.filter((card) => card.needsYou).length,
  };
}

export function summaryLine(summary: { on: number; needs: number }) {
  const needs = summary.needs === 1 ? "1 needs you" : `${summary.needs} need you`;
  return `${summary.on} on · ${needs}`;
}

export function splitTeamGroups<T extends { pinned: boolean; enabled: boolean }>(cards: T[]) {
  return {
    pinned: cards.filter((card) => card.pinned),
    on: cards.filter((card) => !card.pinned && card.enabled),
    off: cards.filter((card) => !card.pinned && !card.enabled),
  };
}
