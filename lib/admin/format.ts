import { formatInr } from "@/lib/config";

export function toIstInput(date: Date | null | undefined) {
  if (!date) return "";
  const ist = new Date(date.getTime() + 5.5 * 3600 * 1000);
  return ist.toISOString().slice(0, 16);
}

export function istDay(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function money(amount: number) {
  return formatInr(amount);
}

export function pageParam(value: string | undefined) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export function qs(base: Record<string, string | undefined>, extra: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...base, ...extra })) {
    if (value !== undefined && value !== "" && value !== null) params.set(key, String(value));
  }
  const out = params.toString();
  return out ? `?${out}` : "";
}
