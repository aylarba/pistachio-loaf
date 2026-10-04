// Runs every 15 minutes. Releases loaves held by orders that were never paid.
import { listExpired, setStatus, release } from "./lib/db.js";

export async function handler() {
  const expired = await listExpired(new Date().toISOString());
  let released = 0;
  for (const order of expired) {
    const changed = await setStatus(order, "awaiting_payment", "expired");
    if (changed) {
      await release(order.date, order.quantity);
      released++;
    }
  }
  console.log(`Expired ${released} unpaid order(s)`);
  return { released };
}
