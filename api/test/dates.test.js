import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, bookableDates, todayInZone } from "../src/lib/dates.js";

test("addDays crosses month boundaries", () => {
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
});

test("today is computed in DC time, not UTC", () => {
  // 02:00 UTC on Oct 5 is still Oct 4 in Washington, DC
  assert.equal(todayInZone("America/New_York", new Date("2026-10-05T02:00:00Z")), "2026-10-04");
});

test("bookable dates respect lead time and bake days", () => {
  const now = new Date("2026-10-04T15:00:00Z"); // Sunday in DC
  const dates = bookableDates(
    { timeZone: "America/New_York", leadDays: 2, windowDays: 7, bakeDays: [5, 6] }, // Fri, Sat
    now
  );
  assert.deepEqual(dates, ["2026-10-09", "2026-10-10"]);
});
