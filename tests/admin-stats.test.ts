import assert from "node:assert/strict";
import test from "node:test";
import { netRevenue, readStatsRange } from "../lib/admin/range";
import { oneReassurance } from "../lib/approval-copy";

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

test("a stored card drops a second reassurance", () => {
  const shown = oneReassurance(
    "Rohan, your ads watcher, can help the shop. No budget change without your yes. This is only a suggestion. Nothing goes out, and no money is spent, until you tap yes.",
  );
  assert.match(shown, /No budget change without your yes\.$/);
  assert.equal((shown.match(/yes/gi) || []).length, 1);
});
