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
  return { priceCents: 2400, deliveryFeeCents: 500, maxPerOrder: 4, paymentWindowHours: 3, venmoUsername: "", dates };
}

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "Something went wrong. Try again.");
    err.fields = data.fields || {};
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function getAvailability() {
  if (demoMode) return sampleAvailability();
  return request("/availability");
}

export async function placeOrder(order) {
  if (demoMode) {
    const err = new Error("Online ordering opens soon. Follow us on Instagram for the launch.");
    err.fields = {};
    throw err;
  }
  return request("/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(order),
  }); // { code, totalCents, expiresAt, venmoUsername, venmoUrl }
}

export function adminList(key, status) {
  return request(`/admin/orders?status=${encodeURIComponent(status)}`, { headers: { "x-admin-key": key } });
}

export function adminSetStatus(key, code, status) {
  return request(`/admin/orders/${encodeURIComponent(code)}/status`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-admin-key": key },
    body: JSON.stringify({ status }),
  });
}

export const money = (cents) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;

export function formatDate(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
