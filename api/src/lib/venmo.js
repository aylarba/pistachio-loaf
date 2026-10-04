import { randomInt } from "node:crypto";

// Short, readable order codes customers put in their Venmo note, e.g. LZ-7KQ4M.
// No 0/O or 1/I/L, so codes are easy to read back.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function orderCode(length = 5) {
  let s = "";
  for (let i = 0; i < length; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `LZ-${s}`;
}

/** A link that opens Venmo with the recipient, amount and note filled in. */
export function venmoPayLink({ username, amountCents, note }) {
  const params = new URLSearchParams({
    txn: "pay",
    recipients: username,
    amount: (amountCents / 100).toFixed(2),
    note,
  });
  return `https://account.venmo.com/payment-link?${params.toString()}`;
}
