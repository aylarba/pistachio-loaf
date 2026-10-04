// POST /orders
// Validates the order, reserves the loaves, saves it as awaiting_payment,
// and returns a Venmo link with the amount and order code filled in.
import { config } from "./lib/config.js";
import { bookableDates } from "./lib/dates.js";
import { validateOrder, orderTotalCents } from "./lib/validate.js";
import { reserve, release, putOrder } from "./lib/db.js";
import { orderCode, venmoPayLink } from "./lib/venmo.js";
import { notifyNewOrder } from "./lib/email.js";
import { json, parseJson } from "./lib/http.js";

export async function handler(event) {
  const body = parseJson(event);
  if (!body) return json(event, 400, { error: "Invalid request." });

  const allowedDates = bookableDates({
    timeZone: config.timeZone,
    leadDays: config.leadDays,
    windowDays: config.bookingWindowDays,
    bakeDays: config.bakeDays,
  });
  const { ok, errors, order } = validateOrder(body, { allowedDates, maxPerOrder: config.maxPerOrder });
  if (!ok) return json(event, 422, { error: "Please fix the highlighted fields.", fields: errors });

  if (!(await reserve(order.date, order.quantity, config.dailyCapacity))) {
    return json(event, 409, {
      error: "That day is fully booked. Choose another date.",
      fields: { date: "Not enough loaves left on this date." },
    });
  }

  const now = new Date();
  const totalCents = orderTotalCents(order, config);
  const expiresAt = new Date(now.getTime() + config.paymentWindowHours * 3600_000).toISOString();

  try {
    let saved = null;
    for (let attempt = 0; attempt < 5 && !saved; attempt++) {
      const candidate = {
        ...order,
        code: orderCode(),
        totalCents,
        status: "awaiting_payment",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        expiresAt,
      };
      if (await putOrder(candidate)) saved = candidate;
    }
    if (!saved) throw new Error("Could not allocate an order code");

    await notifyNewOrder(saved);

    return json(event, 201, {
      code: saved.code,
      totalCents,
      expiresAt,
      venmoUsername: config.venmoUsername,
      venmoUrl: venmoPayLink({
        username: config.venmoUsername,
        amountCents: totalCents,
        note: `Lowzineh ${saved.code}`,
      }),
    });
  } catch (err) {
    console.error("order failed", err);
    await release(order.date, order.quantity).catch((e) => console.error("release failed", e));
    return json(event, 500, { error: "Your order could not be saved. Try again in a moment." });
  }
}
