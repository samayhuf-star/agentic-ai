export type BusinessType = { id: string; label: string };
export type BusinessCategory = { id: string; label: string; types: BusinessType[] };

const other: BusinessType = { id: "other", label: "Other (type it)" };

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  { id: "travel", label: "Travel & Tourism", types: [{ id: "agency", label: "Travel agency" }, { id: "tours", label: "Tour operator" }, { id: "stay", label: "Hotel or homestay" }, other] },
  { id: "education", label: "Education & Coaching", types: [{ id: "school", label: "School" }, { id: "coaching", label: "Coaching centre" }, { id: "tutor", label: "Tutor" }, { id: "course", label: "Online course" }, other] },
  { id: "manufacturing", label: "Manufacturing", types: [{ id: "factory", label: "Factory" }, { id: "workshop", label: "Workshop" }, { id: "packaging", label: "Packaging" }, other] },
  { id: "online", label: "Online Services", types: [{ id: "agency", label: "Agency" }, { id: "freelancer", label: "Freelancer" }, { id: "software", label: "Software service" }, other] },
  { id: "retail", label: "Retail & E-commerce", types: [{ id: "shop", label: "Shop" }, { id: "store", label: "Online store" }, { id: "wholesale", label: "Wholesale" }, other] },
  { id: "food", label: "Food & Restaurants", types: [{ id: "restaurant", label: "Restaurant" }, { id: "cafe", label: "Cafe" }, { id: "kitchen", label: "Cloud kitchen" }, { id: "catering", label: "Catering" }, other] },
  { id: "fitness", label: "Health & Fitness", types: [{ id: "gym", label: "Gym" }, { id: "yoga", label: "Yoga studio" }, { id: "coach", label: "Fitness coach" }, { id: "sports", label: "Sports club" }, other] },
  { id: "property", label: "Real Estate", types: [{ id: "broker", label: "Broker" }, { id: "manager", label: "Property manager" }, { id: "builder", label: "Builder" }, other] },
  { id: "beauty", label: "Beauty & Salon", types: [{ id: "salon", label: "Salon" }, { id: "spa", label: "Spa" }, { id: "makeup", label: "Makeup artist" }, other] },
  { id: "professional", label: "Professional Services", types: [{ id: "accountant", label: "Accountant" }, { id: "lawyer", label: "Lawyer" }, { id: "consultant", label: "Consultant" }, other] },
  { id: "events", label: "Events", types: [{ id: "planner", label: "Event planner" }, { id: "venue", label: "Venue" }, { id: "decorator", label: "Decorator" }, other] },
  { id: "other", label: "Other", types: [{ id: "general", label: "General business" }, other] },
];

export type BusinessInput = {
  businessName?: string | null;
  sells?: string | null;
  goal?: string | null;
  category?: string | null;
  businessType?: string | null;
  businessCustom?: string | null;
};

export function categoryById(id: string | null | undefined) {
  return BUSINESS_CATEGORIES.find((item) => item.id === id) || null;
}

export function workPhrase(input: BusinessInput): string | null {
  const category = categoryById(input.category);
  const type = category?.types.find((item) => item.id === input.businessType) || null;
  const custom = input.businessCustom?.trim() || "";
  if (type?.id === "other") return custom || null;
  if (type && category) return `${type.label} (${category.label})`;
  const legacy = input.sells?.trim() || "";
  if (!legacy || legacy.toLowerCase() === "everyday work") return null;
  return legacy;
}

export function businessContext(input: BusinessInput, goalLabel: string | null) {
  const name = input.businessName?.trim() || "";
  const work = workPhrase(input);
  const parts: string[] = [];
  if (name && work) parts.push(`The business is ${name}. They do this: ${work}.`);
  else if (name) parts.push(`The business is ${name}.`);
  else if (work) parts.push(`They do this: ${work}.`);
  if (goalLabel) parts.push(`Their main goal: ${goalLabel}.`);
  return parts.join(" ");
}

export function parseBusinessChoice(body: { category?: unknown; businessType?: unknown; businessCustom?: unknown }) {
  const category = categoryById(typeof body.category === "string" ? body.category : "");
  if (!category) return { ok: false as const, message: "Pick a category." };
  const type = category.types.find((item) => item.id === body.businessType);
  if (!type) return { ok: false as const, message: "Pick a business type." };
  const custom = String(body.businessCustom || "").trim();
  if (type.id === "other" && (custom.length < 2 || custom.length > 80)) {
    return { ok: false as const, message: "Type a short name for the business." };
  }
  return {
    ok: true as const,
    category: category.id,
    businessType: type.id,
    businessCustom: type.id === "other" ? custom : null,
    sells: type.id === "other" ? custom : `${type.label} (${category.label})`,
  };
}

export type SavePhase = "idle" | "saving" | "saved" | "error";

export function saveButtonState(dirty: boolean, phase: SavePhase) {
  if (phase === "saving") return { label: "Saving…", disabled: true };
  if (!dirty && phase === "saved") return { label: "Saved", disabled: true };
  if (!dirty) return { label: "Save changes", disabled: true };
  return { label: "Save changes", disabled: false };
}
