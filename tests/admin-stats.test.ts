import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "../lib/prisma";
import { funnelSnapshot, orderRows, salesSnapshot } from "../lib/admin/stats";
import { netRevenue, readStatsRange } from "../lib/admin/range";
import { istDayKey, istDayStart, orderInstant } from "../lib/ist";
import { oneReassurance } from "../lib/approval-copy";

function atIst(year: number, month: number, day: number, hour: number, minute: number) {
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - 5.5 * 60 * 60 * 1000);
}

test("net revenue is paid minus refunded", () => {
  assert.equal(netRevenue(1999, 0), 1999);
  assert.equal(netRevenue(3998, 1999), 1999);
});

test("the default stats view is all time and live only", () => {
  const range = readStatsRange({});
  assert.equal(range.key, "all");
  assert.equal(range.from, null);
  assert.equal(range.includeTest, false);
  const today = readStatsRange({ range: "today" });
  assert.ok(today.from);
  assert.ok(today.to.getTime() >= today.from!.getTime());
});

test("00:10 IST and 23:50 IST land on the same India day in the cards, chart and table", async () => {
  const early = atIst(2024, 3, 11, 0, 10);
  const late = atIst(2024, 3, 11, 23, 50);
  const nextMorning = atIst(2024, 3, 12, 0, 10);
  const previousEvening = atIst(2024, 3, 10, 23, 50);
  assert.equal(early.toISOString().slice(0, 10), "2024-03-10");
  assert.equal(late.toISOString().slice(0, 10), "2024-03-11");
  assert.equal(istDayKey(early), "2024-03-11");
  assert.equal(istDayKey(late), "2024-03-11");
  const ids = ["buck-early", "buck-late", "buck-fallback", "buck-next", "buck-pending", "buck-before"];
  await prisma.payment.deleteMany({ where: { id: { in: ids } } });
  try {
    await prisma.payment.createMany({
      data: [
        { id: "buck-early", gateway: "cashfree", amountInr: 1999, status: "paid", paidAt: early, createdAt: previousEvening, gatewayConfirmedAt: early, email: "buck@local.test" },
        { id: "buck-late", gateway: "cashfree", amountInr: 1999, status: "paid", paidAt: late, createdAt: early, gatewayConfirmedAt: late, email: "buck@local.test" },
        { id: "buck-fallback", gateway: "cashfree", amountInr: 1999, status: "paid", paidAt: null, createdAt: late, gatewayConfirmedAt: late, email: "buck@local.test" },
        { id: "buck-next", gateway: "cashfree", amountInr: 1999, status: "paid", paidAt: nextMorning, gatewayConfirmedAt: nextMorning, email: "buck@local.test" },
        { id: "buck-pending", gateway: "cashfree", amountInr: 1999, status: "pending", createdAt: early, email: "buck@local.test" },
        { id: "buck-before", gateway: "cashfree", amountInr: 1999, status: "pending", createdAt: previousEvening, email: "buck@local.test" },
      ],
    });
    const range = readStatsRange({ range: "custom", from: "2024-03-11", to: "2024-03-11", tests: "1" });
    const sales = await salesSnapshot(range);
    const listed = await orderRows(range, "all");
    const funnel = await funnelSnapshot(range);
    const bars = sales.days.filter((day) => day.orders > 0);
    assert.deepEqual(bars.map((day) => day.day), ["2024-03-11"]);
    assert.equal(bars[0].orders, 3);
    assert.equal(sales.rangeOrders, 3);
    assert.equal(sales.rangePaid, 5997);
    assert.equal(funnel.find((step) => step.label === "Paid")?.count, 3);
    const shown = new Map(listed.rows.map((row) => [row.id, istDayKey(row.shownAt)]));
    assert.equal(shown.get("buck-early"), "2024-03-11");
    assert.equal(shown.get("buck-late"), "2024-03-11");
    assert.equal(shown.get("buck-fallback"), "2024-03-11");
    assert.equal(shown.get("buck-pending"), "2024-03-11");
    assert.equal(orderInstant({ status: "pending", paidAt: late, createdAt: early }).getTime(), early.getTime());
    assert.equal(shown.has("buck-next"), false);
    assert.equal(shown.has("buck-before"), false);
  } finally {
    await prisma.payment.deleteMany({ where: { id: { in: ids } } });
  }
});

test("today's paid count matches the today bar", async () => {
  const now = new Date();
  const todayStart = istDayStart(now);
  const earlyToday = new Date(todayStart.getTime() + 10 * 60 * 1000);
  const paidToday = earlyToday.getTime() <= now.getTime() ? earlyToday : now;
  const lateYesterday = new Date(todayStart.getTime() - 10 * 60 * 1000);
  const ids = ["buck-today", "buck-yesterday"];
  await prisma.payment.deleteMany({ where: { id: { in: ids } } });
  try {
    await prisma.payment.createMany({
      data: [
        { id: "buck-today", gateway: "cashfree", amountInr: 1999, status: "paid", paidAt: paidToday, createdAt: lateYesterday, gatewayConfirmedAt: paidToday, email: "buck@local.test" },
        { id: "buck-yesterday", gateway: "cashfree", amountInr: 1999, status: "paid", paidAt: lateYesterday, gatewayConfirmedAt: lateYesterday, email: "buck@local.test" },
      ],
    });
    const sales = await salesSnapshot(readStatsRange({ range: "all", tests: "1" }));
    const todayKey = istDayKey(now);
    const todayCard = sales.windows.find((window) => window.label === "Today");
    const todayBar = sales.days.find((day) => day.day === todayKey);
    const yesterdayBar = sales.days.find((day) => day.day === istDayKey(lateYesterday));
    assert.equal(todayCard?.orders, todayBar?.orders);
    assert.equal(istDayKey(paidToday), todayKey);
    assert.notEqual(istDayKey(lateYesterday), todayKey);
    assert.ok((yesterdayBar?.orders || 0) >= 1);
    const todayOrders = await orderRows(readStatsRange({ range: "today", tests: "1" }), "all");
    assert.equal(todayOrders.rows.some((row) => row.id === "buck-today"), true);
    assert.equal(todayOrders.rows.some((row) => row.id === "buck-yesterday"), false);
    assert.equal(istDayKey(todayOrders.rows.find((row) => row.id === "buck-today")!.shownAt), todayKey);
  } finally {
    await prisma.payment.deleteMany({ where: { id: { in: ids } } });
  }
});

test("a stored card drops a second reassurance", () => {
  const shown = oneReassurance(
    "Rohan, your ads watcher, can help the shop. No budget change without your yes. This is only a suggestion. Nothing goes out, and no money is spent, until you tap yes.",
  );
  assert.match(shown, /No budget change without your yes\.$/);
  assert.equal((shown.match(/yes/gi) || []).length, 1);
});
