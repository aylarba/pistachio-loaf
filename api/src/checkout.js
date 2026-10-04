// POST /checkout
// Validates the order, reserves capacity for the day, saves a pending order,
// and returns a Stripe Checkout URL. Payment is confirmed later by the webhook.
import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import { config } from "./lib/config.js";
import { bookableDates } from "./lib/dates.js";
import { validateOrder, orderTotalCents } from "./lib/validate.js";
import { reserve, release, putOrder, setStatus } from "./lib/db.js";
import { json, parseJson } from "./lib/http.js";

const stripe = new Stripe(config.stripeSecretKey);
const CHECKOUT_MINUTES = 30; // Stripe's minimum session lifetime

export async function handler(event) {
  const body = parseJson(event);
  if (!body) return json(event, 400, { error: "Invalid JSON." });

  const allowedDates = bookableDates({
    timeZone: config.timeZone,
    leadDays: config.leadDays,
    windowDays: config.bookingWindowDays,
    bakeDays: config.bakeDays,
  });
  const { ok, errors, order } = validateOrder(body, { allowedDates, maxPerOrder: config.maxPerOrder });
  if (!ok) return json(event, 422, { error: "Please fix the highlighted fields.", fields: errors });

  const reserved = await reserve(order.date, order.quantity, config.dailyCapacity);
  if (!reserved) {
    return json(event, 409, {
      error: "That day is fully booked. Choose another date.",
      fields: { date: "Not enough loaves left on this date." },
    });
  }

  const id = randomUUID();
  const totalCents = orderTotalCents(order, config);
  const now = new Date().toISOString();

  try {
    await putOrder({ id, ...order, totalCents, status: "pending", createdAt: now, updatedAt: now });

    const lineItems = [
      {
        quantity: order.quantity,
        price_data: {
          currency: "usd",
          unit_amount: config.priceCents,
          product_data: { name: config.productName },
        },
      },
    ];
    if (order.method === "delivery" && config.deliveryFeeCents > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: config.deliveryFeeCents,
          product_data: { name: "Delivery within Washington, DC" },
        },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: order.email,
      line_items: lineItems,
      client_reference_id: id,
      metadata: { orderId: id, date: order.date, quantity: String(order.quantity) },
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_MINUTES * 60,
      success_url: `${config.siteUrl}/?order=success&id=${id}`,
      cancel_url: `${config.siteUrl}/?order=cancelled#order`,
    });

    await setStatus(id, "pending", "pending", { stripeSessionId: session.id });
    return json(event, 200, { checkoutUrl: session.url, orderId: id });
  } catch (err) {
    console.error("checkout failed", err);
    // Give the loaves back so the day is not blocked by a failed checkout.
    await release(order.date, order.quantity).catch((e) => console.error("release failed", e));
    await setStatus(id, "pending", "failed").catch(() => {});
    return json(event, 502, { error: "Payment could not be started. Try again in a moment." });
  }
}
