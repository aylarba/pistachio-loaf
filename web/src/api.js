const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export const demoMode = !API_URL;

function sampleAvailability() {
  const dates = [];
  const d = new Date();
  d.setDate(d.getDate() + 2);
  for (let i = 0; i < 14; i++) {
    dates.push({ date: d.toISOString().slice(0, 10), remaining: 6 });
    d.setDate(d.getDate() + 1);
  }
  return { priceCents: 2400, deliveryFeeCents: 500, maxPerOrder: 4, dates };
}

export async function getAvailability() {
  if (demoMode) return sampleAvailability();
  const res = await fetch(`${API_URL}/availability`);
  if (!res.ok) throw new Error("Could not load available dates.");
  return res.json();
}

export async function startCheckout(order) {
  if (demoMode) {
    const err = new Error("Online ordering isn't open yet. Email us to order.");
    err.fields = {};
    throw err;
  }
  const res = await fetch(`${API_URL}/checkout`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(order),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "Something went wrong. Try again.");
    err.fields = data.fields || {};
    throw err;
  }
  return data; // { checkoutUrl, orderId }
}

export const money = (cents) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;

export function formatDate(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
