// POST /stripe/webhook
// Stripe calls this when a checkout is paid or expires.
// Status changes are conditional, so repeated deliveries are safe.
import Stripe from "stripe";
import { config } from "./lib/config.js";
import { getOrder, setStatus, release } from "./lib/db.js";
import { sendOrderEmails } from "./lib/email.js";
import { rawBody } from "./lib/http.js";

const stripe = new Stripe(config.stripeSecretKey);

const reply = (statusCode, message) => ({ statusCode, body: message });

export async function handler(event) {
  const signature = event.headers?.["stripe-signature"] || event.headers?.["Stripe-Signature"];
  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody(event), signature, config.stripeWebhookSecret);
  } catch (err) {
    console.warn("Invalid webhook signature", err.message);
    return reply(400, "Invalid signature");
  }

  const session = stripeEvent.data.object;
  const orderId = session?.metadata?.orderId;
  if (!orderId) return reply(200, "Ignored");

  try {
    if (stripeEvent.type === "checkout.session.completed" && session.payment_status === "paid") {
      const changed = await setStatus(orderId, "pending", "paid", {
        paidAt: new Date().toISOString(),
        stripePaymentIntent: session.payment_intent ?? null,
      });
      if (changed) {
        const order = await getOrder(orderId);
        if (order) await sendOrderEmails(order);
      }
    } else if (stripeEvent.type === "checkout.session.expired") {
      const changed = await setStatus(orderId, "pending", "expired");
      if (changed) {
        const order = await getOrder(orderId);
        if (order) await release(order.date, order.quantity);
      }
    }
    return reply(200, "ok");
  } catch (err) {
    console.error("webhook processing failed", err);
    // Non-2xx makes Stripe retry later.
    return reply(500, "Retry");
  }
}
