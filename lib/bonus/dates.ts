const IST = "Asia/Kolkata";
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

function istParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0);
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
}

function fromIst(year: number, month: number, day: number, hour: number, minute: number, second: number) {
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second) - IST_OFFSET_MS);
}

export function addMonths(date: Date, months: number) {
  const parts = istParts(date);
  const index = parts.month - 1 + months;
  const year = parts.year + Math.floor(index / 12);
  const month = (index % 12) + 1;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return fromIst(year, month, Math.min(parts.day, lastDay), parts.hour, parts.minute, parts.second);
}

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatWhen(date: Date) {
  const time = new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h12",
  }).format(date);
  return `${formatLongDate(date)}, ${time} IST`;
}

export function purchaseStart(payment: { paidAt: Date | null; createdAt: Date }) {
  return payment.paidAt ?? payment.createdAt;
}
