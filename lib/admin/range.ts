import { startOfTodayIst } from "@/lib/guard";
import { istDayKey, istDayStart } from "@/lib/ist";

export type RangeKey = "today" | "7d" | "30d" | "all" | "custom";

export type StatsRange = {
  key: RangeKey;
  from: Date | null;
  to: Date;
  fromInput: string;
  toInput: string;
  includeTest: boolean;
};

const DAY = 24 * 60 * 60 * 1000;

function istDateInput(date: Date) {
  return istDayKey(date);
}

function parseIstDate(value: string | undefined, end: boolean) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day) - 5.5 * 60 * 60 * 1000);
  if (Number.isNaN(start.getTime())) return null;
  return end ? new Date(start.getTime() + DAY - 1) : start;
}

export function readStatsRange(params: { range?: string; from?: string; to?: string; tests?: string }): StatsRange {
  const today = startOfTodayIst();
  const now = new Date();
  const key: RangeKey = params.range === "today" || params.range === "7d" || params.range === "30d" || params.range === "custom" ? params.range : "all";
  let from: Date | null = null;
  let to = now;
  if (key === "today") from = today;
  if (key === "7d") from = new Date(today.getTime() - 6 * DAY);
  if (key === "30d") from = new Date(today.getTime() - 29 * DAY);
  if (key === "custom") {
    from = parseIstDate(params.from, false);
    const end = parseIstDate(params.to, true);
    if (end) to = end;
  }
  return {
    key,
    from,
    to,
    fromInput: params.from || (from ? istDateInput(from) : ""),
    toInput: params.to || istDateInput(to),
    includeTest: params.tests === "1",
  };
}

export function fixedWindows(now = new Date()) {
  const today = istDayStart(now);
  return {
    today,
    week: new Date(today.getTime() - 6 * DAY),
    month: new Date(today.getTime() - 29 * DAY),
    now,
  };
}

export function netRevenue(paidInr: number, refundedInr: number) {
  return paidInr - refundedInr;
}

export function rangeQuery(range: StatsRange, extra?: Record<string, string>) {
  const params = new URLSearchParams();
  params.set("range", range.key);
  if (range.includeTest) params.set("tests", "1");
  if (range.key === "custom") {
    if (range.fromInput) params.set("from", range.fromInput);
    if (range.toInput) params.set("to", range.toInput);
  }
  for (const [key, value] of Object.entries(extra || {})) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

export function daysInRange(from: Date, to: Date) {
  const start = istDayStart(from);
  const end = istDayStart(to);
  const days: Date[] = [];
  for (let cursor = start.getTime(); cursor <= end.getTime() && days.length < 90; cursor += DAY) days.push(new Date(cursor));
  return days;
}
