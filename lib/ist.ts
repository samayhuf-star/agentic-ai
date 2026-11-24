const OFFSET = 5.5 * 60 * 60 * 1000;

export function istDayStart(date: Date) {
  const ist = new Date(date.getTime() + OFFSET);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - OFFSET);
}

export function istDayKey(date: Date) {
  const ist = new Date(date.getTime() + OFFSET);
  const year = ist.getUTCFullYear();
  const month = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const day = String(ist.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** IST calendar day of a Prisma timestamp, which is stored as UTC wall time. */
export function istDayExpr(columnSql: string) {
  return `to_char((${columnSql} AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')`;
}

export function orderInstant(row: { status: string; paidAt?: Date | null; createdAt: Date }) {
  if (row.status === "paid" || row.status === "refunded") return row.paidAt ?? row.createdAt;
  return row.createdAt;
}
