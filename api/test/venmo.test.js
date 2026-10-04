import { test } from "node:test";
import assert from "node:assert/strict";
import { orderCode, venmoPayLink } from "../src/lib/venmo.js";

test("order codes are short and unambiguous", () => {
  for (let i = 0; i < 200; i++) {
    const c = orderCode();
    assert.match(c, /^LZ-[2-9A-HJKMNP-Z]{5}$/);
  }
});

test("Venmo link fills recipient, amount and note", () => {
  const url = new URL(venmoPayLink({ username: "lowzineh", amountCents: 2900, note: "Lowzineh LZ-ABCDE" }));
  assert.equal(url.hostname, "account.venmo.com");
  assert.equal(url.searchParams.get("recipients"), "lowzineh");
  assert.equal(url.searchParams.get("amount"), "29.00");
  assert.equal(url.searchParams.get("note"), "Lowzineh LZ-ABCDE");
  assert.equal(url.searchParams.get("txn"), "pay");
});
