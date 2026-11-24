import { categoryById, typeById } from "@/lib/business-catalog";

export type BusinessInput = {
  category?: unknown;
  businessType?: unknown;
  customType?: unknown;
};

export type SavedBusiness = {
  category: string;
  businessType: string;
  customType: string | null;
  sells: string;
};

const blockedWork = /everyday work/i;

export function validateBusinessSelection(input: BusinessInput): { ok: true; value: SavedBusiness } | { ok: false; message: string } {
  const category = categoryById(typeof input.category === "string" ? input.category : "");
  if (!category) return { ok: false, message: "Pick a category." };
  const type = typeById(category.id, typeof input.businessType === "string" ? input.businessType : "");
  if (!type) return { ok: false, message: "Pick a business type." };
  const custom = typeof input.customType === "string" ? input.customType.trim() : "";
  if (type.custom) {
    if (custom.length < 2 || custom.length > 80) return { ok: false, message: "Type the kind of business, in a few words." };
    if (blockedWork.test(custom)) return { ok: false, message: "Type the kind of business, in a few words." };
    return { ok: true, value: { category: category.id, businessType: type.id, customType: custom, sells: custom } };
  }
  return { ok: true, value: { category: category.id, businessType: type.id, customType: null, sells: type.label } };
}

type ProfileBits = {
  businessName?: string | null;
  sells?: string | null;
  category?: string | null;
  businessType?: string | null;
  customType?: string | null;
};

export function workLabel(user: ProfileBits) {
  const category = categoryById(user.category);
  const type = typeById(user.category, user.businessType);
  if (category && type?.custom) {
    const custom = user.customType?.trim() || "";
    if (custom && !blockedWork.test(custom)) return `${category.label}: ${custom}`;
  }
  if (category && type && !type.custom) return `${category.label}: ${type.label}`;
  const sells = user.sells?.trim() || "";
  if (sells && !blockedWork.test(sells)) return sells;
  return "";
}

export function businessPromptLine(user: ProfileBits) {
  const name = user.businessName?.trim() || "";
  const work = workLabel(user);
  if (name && work) return `The business is called ${name}. They do ${work}.`;
  if (name) return `The business is called ${name}.`;
  if (work) return `They do ${work}.`;
  return "Business details are not filled in. Speak in a general way. Do not invent a business name or a line of work.";
}
