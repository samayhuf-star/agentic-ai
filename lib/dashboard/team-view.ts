export type TeamFilter = "all" | "on" | "picked" | "needs";

export type TeamCardFields = {
  id: string;
  name: string;
  role: string;
  enabled: boolean;
  recommended: boolean;
  pinned: boolean;
  needsYou: boolean;
};

export function teamSummary(cards: { enabled: boolean; needsYou: boolean }[]) {
  return {
    on: cards.filter((card) => card.enabled).length,
    needs: cards.filter((card) => card.needsYou).length,
  };
}

export function arrangeTeam<T extends TeamCardFields>(cards: T[], filter: TeamFilter, query: string): T[] {
  const needle = query.trim().toLowerCase();
  const shown = cards.filter((card) => {
    if (filter === "on" && !card.enabled) return false;
    if (filter === "picked" && !card.recommended) return false;
    if (filter === "needs" && !card.needsYou) return false;
    if (!needle) return true;
    return card.name.toLowerCase().includes(needle) || card.role.toLowerCase().includes(needle);
  });
  return shown
    .map((card, index) => ({ card, index: cards.indexOf(card) === -1 ? index : cards.indexOf(card) }))
    .sort((a, b) => {
      if (a.card.pinned !== b.card.pinned) return a.card.pinned ? -1 : 1;
      if (filter === "all" && a.card.enabled !== b.card.enabled) return a.card.enabled ? -1 : 1;
      return a.index - b.index;
    })
    .map((item) => item.card);
}

export function teamGroups<T extends TeamCardFields>(cards: T[], filter: TeamFilter) {
  const pinned = cards.filter((card) => card.pinned);
  const rest = cards.filter((card) => !card.pinned);
  if (filter !== "all") return [{ key: "pinned", pinned: true, cards: pinned }, { key: "rest", pinned: false, cards: rest }].filter((group) => group.cards.length > 0);
  const buckets = [
    { key: "pinned-on", pinned: true, cards: pinned.filter((card) => card.enabled) },
    { key: "pinned-off", pinned: true, cards: pinned.filter((card) => !card.enabled) },
    { key: "on", pinned: false, cards: rest.filter((card) => card.enabled) },
    { key: "off", pinned: false, cards: rest.filter((card) => !card.enabled) },
  ];
  return buckets.filter((group) => group.cards.length > 0);
}
