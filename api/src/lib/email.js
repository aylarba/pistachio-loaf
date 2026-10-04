import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { config } from "./config.js";

const ses = new SESv2Client({});

const money = (cents) => `$${(cents / 100).toFixed(2)}`;

function summary(order) {
  const lines = [
    `Order: ${order.id}`,
    `Name: ${order.name}`,
    `Email: ${order.email}`,
    order.phone ? `Phone: ${order.phone}` : null,
    `Loaves: ${order.quantity}`,
    `Date: ${order.date}`,
    `Delivery: Washington, DC`,
    order.address ? `Address: ${order.address.line1} ${order.address.line2 || ""}, Washington, DC ${order.address.zip}` : null,
    order.notes ? `Notes: ${order.notes}` : null,
    `Total paid: ${money(order.totalCents)}`,
  ];
  return lines.filter(Boolean).join("\n");
}

async function send(to, subject, text) {
  if (!config.fromEmail || !to) return;
  await ses.send(
    new SendEmailCommand({
      FromEmailAddress: config.fromEmail,
      Destination: { ToAddresses: [to] },
      // Replies go to the bakery's inbox (e.g. a Gmail address), not the SES sender.
      ReplyToAddresses: config.ownerEmail ? [config.ownerEmail] : undefined,
      Content: { Simple: { Subject: { Data: subject }, Body: { Text: { Data: text } } } },
    })
  );
}

export async function sendOrderEmails(order) {
  const details = summary(order);
  await Promise.allSettled([
    send(config.ownerEmail, `New order: ${order.quantity} loaf(s) for ${order.date}`, details),
    send(
      order.email,
      "Your loaf order is confirmed",
      `Thank you, ${order.name}! Your order is confirmed.\n\n${details}\n\nReply to this email if you have any questions.`
    ),
  ]);
}
