import { appNames, CONTENT_TYPES, PLATFORMS, RATE_TYPES } from "@/lib/creators/apps";

export function splitList(value: string | null | undefined, sep = ",") {
  return (value || "")
    .split(sep === "," ? /[,\n]+/ : /\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function platformLabel(id: string) {
  return PLATFORMS.find((item) => item.id === id)?.label || id;
}

export function contentLabels(ids: string) {
  const map = new Map<string, string>(CONTENT_TYPES.map((item) => [item.id, item.label]));
  return splitList(ids).map((id) => map.get(id) || id);
}

export function rateLabel(id: string | null) {
  if (!id) return "";
  return RATE_TYPES.find((item) => item.id === id)?.label || id;
}

export function selectedAppNames(value: string) {
  return appNames(splitList(value));
}

export function csvCell(value: string | number | boolean | null | undefined) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}
