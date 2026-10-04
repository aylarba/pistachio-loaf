// Optional email notifications via Amazon SES.
// Turned off unless FROM_EMAIL is set (it needs a verified domain or address in SES).
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { config } from "./config.js";

const ses = new SESv2Client({});
const money = (cents) => `$${(cents / 100).toFixed(2)}`;

export function orderSummary(order) {
  return [
    `Order: ${order.code}`,
    `Name: ${order.name}`,
    `Email: ${order.email}`,
    `Phone: ${order.phone}`,
    `Loaves: ${order.quantity}`,
    `Delivery date: ${order.date}`,
    `Address: ${order.address.line1}${order.address.line2 ? ", " + order.address.line2 : ""}, Washington, DC ${order.address.zip}`,
    order.notes ? `Notes: ${order.notes}` : null,
    `Total: ${money(order.totalCents)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function send(to, subject, text) {
  if (!config.fromEmail || !to) return;
  await ses.send(
    new SendEmailCommand({
      FromEmailAddress: config.fromEmail,
      Destination: { ToAddresses: [to] },
      ReplyToAddresses: config.ownerEmail ? [config.ownerEmail] : undefined,
      Content: { Simple: { Subject: { Data: subject }, Body: { Text: { Data: text } } } },
    })
  );
}

export async function notifyNewOrder(order) {
  await send(config.ownerEmail, `New order ${order.code}: ${order.quantity} loaf(s) for ${order.date}`, orderSummary(order))
    .catch((e) => console.error("owner email failed", e));
}

export async function notifyPaid(order) {
  await send(
    order.email,
    `Lowzineh order ${order.code} is confirmed`,
    `Thank you, ${order.name}! We received your payment and your order is confirmed.\n\n${orderSummary(order)}`
  ).catch((e) => console.error("customer email failed", e));
}
