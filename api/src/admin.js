// Baker-only endpoints, protected by the x-admin-key header.
//   GET  /admin/orders?status=awaiting_payment|paid|delivered|cancelled|expired
//   POST /admin/orders/{code}/status   { "status": "paid" | "delivered" | "cancelled" }
import { getOrder, setStatus, listByStatus, release } from "./lib/db.js";
import { notifyPaid } from "./lib/email.js";
import { json, parseJson, isAdmin } from "./lib/http.js";

const STATUSES = ["awaiting_payment", "paid", "delivered", "cancelled", "expired"];

// Allowed moves. Cancelling gives the loaves back to that day.
const TRANSITIONS = {
  awaiting_payment: ["paid", "cancelled"],
  paid: ["delivered", "cancelled"],
};

const publicOrder = ({ PK, SK, GSI1PK, GSI1SK, ...o }) => o;

export async function handler(event) {
  if (!isAdmin(event)) return json(event, 401, { error: "Wrong admin key." });

  const method = event.requestContext?.http?.method || event.httpMethod;
  try {
    if (method === "GET") {
      const status = event.queryStringParameters?.status || "awaiting_payment";
      if (!STATUSES.includes(status)) return json(event, 400, { error: "Unknown status." });
      const orders = await listByStatus(status);
      return json(event, 200, { orders: orders.map(publicOrder) });
    }

    const code = event.pathParameters?.code;
    const body = parseJson(event) || {};
    const order = code && (await getOrder(code));
    if (!order) return json(event, 404, { error: "Order not found." });

    const to = body.status;
    if (!(TRANSITIONS[order.status] || []).includes(to)) {
      return json(event, 409, { error: `Can't change an order from ${order.status} to ${to}.` });
    }

    const updated = await setStatus(order, order.status, to);
    if (!updated) return json(event, 409, { error: "The order changed meanwhile. Refresh and try again." });

    if (to === "cancelled") await release(order.date, order.quantity);
    if (to === "paid") await notifyPaid(updated);

    return json(event, 200, { order: publicOrder(updated) });
  } catch (err) {
    console.error("admin failed", err);
    return json(event, 500, { error: "Something went wrong." });
  }
}
