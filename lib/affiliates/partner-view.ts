import { cache } from "react";
import { notFound } from "next/navigation";
import { parseHidden, type BlockKey } from "@/lib/affiliates/dashboard";
import { partnerFromToken } from "@/lib/affiliates/partner-api";

export const loadPartner = cache(async (token: string) => {
  const affiliate = await partnerFromToken(token);
  if (!affiliate) notFound();
  const hidden = parseHidden(affiliate.hiddenBlocks);
  // Pending and rejected creators see zeros and no lists: nothing is queried for them.
  const approved = affiliate.status === "active" || affiliate.status === "paused";
  const show = (key: BlockKey) => approved && !hidden.has(key);
  return { affiliate, approved, show, hidden };
});

export const STATUS_TEXT: Record<string, string> = {
  pending: "Under review",
  active: "Active",
  paused: "Paused",
  rejected: "Not approved",
};
