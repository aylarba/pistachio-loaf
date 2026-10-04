// Validates an order request body. Returns { ok, errors, order }.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Washington, DC ZIP codes (200xx and the 203xx-205xx federal/PO ranges).
const DC_ZIP_RE = /^20(0\d\d|[2-5]\d\d)$/;

const clean = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function validateOrder(body, { allowedDates, maxPerOrder }) {
  const errors = {};
  const b = body && typeof body === "object" ? body : {};

  const name = clean(b.name, 100);
  const email = clean(b.email, 200).toLowerCase();
  const phone = clean(b.phone, 30);
  const date = clean(b.date, 10);
  const method = clean(b.method, 20);
  const notes = clean(b.notes, 500);
  const quantity = Number(b.quantity);

  if (!name) errors.name = "Enter your name.";
  if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > maxPerOrder) {
    errors.quantity = `Choose between 1 and ${maxPerOrder} loaves.`;
  }
  if (!allowedDates.includes(date)) errors.date = "Choose one of the available dates.";
  if (method !== "pickup" && method !== "delivery") errors.method = "Choose pickup or delivery.";

  let address = null;
  if (method === "delivery") {
    const a = b.address && typeof b.address === "object" ? b.address : {};
    address = {
      line1: clean(a.line1, 120),
      line2: clean(a.line2, 120),
      zip: clean(a.zip, 10),
    };
    if (!address.line1) errors.address = "Enter a delivery address.";
    else if (!DC_ZIP_RE.test(address.zip)) {
      errors.address = "Delivery is available within Washington, DC only. Enter a DC ZIP code.";
    }
  }

  const ok = Object.keys(errors).length === 0;
  return {
    ok,
    errors,
    order: ok ? { name, email, phone, date, method, notes, quantity, address } : null,
  };
}

export function orderTotalCents(order, { priceCents, deliveryFeeCents }) {
  return order.quantity * priceCents + (order.method === "delivery" ? deliveryFeeCents : 0);
}
