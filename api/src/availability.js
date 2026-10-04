// GET /availability
// Price, limits, Venmo username, and remaining loaves for each delivery date.
import { config } from "./lib/config.js";
import { bookableDates } from "./lib/dates.js";
import { bookedByDate } from "./lib/db.js";
import { json } from "./lib/http.js";

export async function handler(event) {
  try {
    const dates = bookableDates({
      timeZone: config.timeZone,
      leadDays: config.leadDays,
      windowDays: config.bookingWindowDays,
      bakeDays: config.bakeDays,
    });
    const booked = await bookedByDate(dates);
    return json(event, 200, {
      product: config.productName,
      priceCents: config.priceCents,
      deliveryFeeCents: config.deliveryFeeCents,
      maxPerOrder: config.maxPerOrder,
      paymentWindowHours: config.paymentWindowHours,
      venmoUsername: config.venmoUsername,
      dates: dates.map((date) => ({
        date,
        remaining: Math.max(0, config.dailyCapacity - (booked[date] ?? 0)),
      })),
    });
  } catch (err) {
    console.error("availability failed", err);
    return json(event, 500, { error: "Could not load availability. Try again shortly." });
  }
}
