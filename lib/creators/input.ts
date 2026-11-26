import * as v from "@/lib/admin/validate";
import {
  CONTENT_TYPE_IDS,
  COUNTRIES,
  CREATOR_APP_IDS,
  FOLLOWER_RANGES,
  PLATFORM_IDS,
  RATE_TYPE_IDS,
} from "@/lib/creators/apps";

const FOLLOWER_SET = new Set<string>(FOLLOWER_RANGES);
const COUNTRY_SET = new Set<string>(COUNTRIES);

export type CreatorApplyInput = {
  name: string;
  email: string;
  phone: string | null;
  country: string;
  platform: string;
  profileUrls: string[];
  followerRange: string;
  niche: string;
  contentTypes: string[];
  languages: string;
  rateType: string | null;
  rateNote: string | null;
  sampleLinks: string[];
  note: string | null;
  selectedApps: string[];
  isTest: boolean;
};

export function looksLikeTest(_name: string, email: string, note: string | null) {
  if (note && /^\s*\[TEST\]/i.test(note)) return true;
  if (/\+(test|creatortest)[a-z0-9._-]*@/i.test(email)) return true;
  return false;
}

export function optionalPhone(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
  if (!raw) return null;
  if (raw.length > 40) throw new v.InputError("Phone / WhatsApp must be 40 characters or fewer.");
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) throw new v.InputError("Enter a valid phone or WhatsApp number, or leave it blank.");
  return raw;
}

export function parseUrlList(value: unknown, label: string, { required = false, max = 8 } = {}) {
  const raw = Array.isArray(value)
    ? value.map((item) => String(item)).join("\n")
    : typeof value === "string"
      ? value
      : "";
  const parts = raw
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (required && !parts.length) throw new v.InputError(`${label} is required.`);
  if (parts.length > max) throw new v.InputError(`Add up to ${max} ${label.toLowerCase()}.`);
  return parts.map((item) => normalizeHttpUrl(item, label));
}

export function normalizeHttpUrl(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new v.InputError(`${label} is required.`);
  if (trimmed.length > 500) throw new v.InputError(`${label} is too long.`);
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new v.InputError(`Enter a valid ${label.toLowerCase()}.`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new v.InputError(`Enter a valid ${label.toLowerCase()}.`);
  if (!url.hostname.includes(".")) throw new v.InputError(`Enter a valid ${label.toLowerCase()}.`);
  return url.toString();
}

function stringList(value: unknown, allowed: Set<string>, label: string, { required = false } = {}) {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  const items = [...new Set(raw.map((item) => String(item).trim()).filter(Boolean))];
  if (required && !items.length) throw new v.InputError(`${label} is required.`);
  if (items.some((item) => !allowed.has(item))) throw new v.InputError(`Pick a valid ${label.toLowerCase()}.`);
  return items;
}

export function parseApplication(body: Record<string, unknown>): CreatorApplyInput {
  const name = v.text(body.name, "Name", 80, true)!;
  const email = v.email(body.email, true)!;
  const phone = optionalPhone(body.phone);
  const country = v.text(body.country, "Country", 60, true)!;
  if (!COUNTRY_SET.has(country)) throw new v.InputError("Pick your country.");
  const platform = String(body.platform || "").trim();
  if (!PLATFORM_IDS.has(platform as never)) throw new v.InputError("Pick your primary platform.");
  const profileUrls = parseUrlList(body.profileUrls ?? body.profileUrl, "Profile URL", { required: true, max: 8 });
  const followerRange = String(body.followerRange || "").trim();
  if (!FOLLOWER_SET.has(followerRange)) throw new v.InputError("Pick your follower count range.");
  const niche = v.text(body.niche, "Niche", 80, true)!;
  const contentTypes = stringList(body.contentTypes, CONTENT_TYPE_IDS, "Content type", { required: true });
  const languages = v.text(body.languages, "Languages", 120, true)!;
  const rateTypeRaw = typeof body.rateType === "string" ? body.rateType.trim() : "";
  if (rateTypeRaw && !RATE_TYPE_IDS.has(rateTypeRaw as never)) throw new v.InputError("Pick a valid rate expectation, or leave it blank.");
  const rateNote = v.text(body.rateNote, "Rate note", 200);
  const sampleLinks = parseUrlList(body.sampleLinks, "Sample work link", { required: false, max: 8 });
  const note = v.text(body.note, "Note", 2000);
  const selectedApps = stringList(body.selectedApps, CREATOR_APP_IDS, "App", { required: true });
  if (!v.bool(body.consent) && body.consent !== true) throw new v.InputError("Please confirm you agree to be contacted about this application.");
  return {
    name,
    email,
    phone,
    country,
    platform,
    profileUrls,
    followerRange,
    niche,
    contentTypes,
    languages,
    rateType: rateTypeRaw || null,
    rateNote,
    sampleLinks,
    note,
    selectedApps,
    isTest: looksLikeTest(name, email, note),
  };
}
