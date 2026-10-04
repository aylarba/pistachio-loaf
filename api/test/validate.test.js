import { test } from "node:test";
import assert from "node:assert/strict";
import { validateOrder, orderTotalCents } from "../src/lib/validate.js";

const opts = { allowedDates: ["2026-10-10", "2026-10-11"], maxPerOrder: 4 };
const base = {
  name: "Sara",
  email: "sara@example.com",
  quantity: 2,
  date: "2026-10-10",
  address: { line1: "1 Main St", zip: "20009" },
};

test("accepts a valid delivery order", () => {
  const r = validateOrder(base, opts);
  assert.equal(r.ok, true);
  assert.equal(r.order.method, "delivery");
});

test("requires a delivery address", () => {
  assert.ok(validateOrder({ ...base, address: undefined }, opts).errors.address);
});

test("rejects dates outside the bookable list", () => {
  const r = validateOrder({ ...base, date: "2026-10-09" }, opts);
  assert.equal(r.ok, false);
  assert.ok(r.errors.date);
});

test("rejects too many loaves", () => {
  assert.ok(validateOrder({ ...base, quantity: 5 }, opts).errors.quantity);
  assert.ok(validateOrder({ ...base, quantity: 0 }, opts).errors.quantity);
  assert.ok(validateOrder({ ...base, quantity: 1.5 }, opts).errors.quantity);
});

test("delivery requires a DC ZIP code", () => {
  const md = validateOrder({ ...base, address: { line1: "1 Main St", zip: "20910" } }, opts);
  assert.equal(md.ok, false);
  const dc = validateOrder(base, opts);
  assert.equal(dc.ok, true);
});

test("rejects a bad email", () => {
  assert.ok(validateOrder({ ...base, email: "nope" }, opts).errors.email);
});

test("total includes the delivery fee", () => {
  const prices = { priceCents: 2400, deliveryFeeCents: 500 };
  assert.equal(orderTotalCents({ quantity: 2, method: "delivery" }, prices), 5300);
});
