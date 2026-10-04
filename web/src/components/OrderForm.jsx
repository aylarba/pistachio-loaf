import { useMemo, useState } from "react";
import { startCheckout, money, formatDate } from "../api.js";

const initial = {
  name: "",
  email: "",
  phone: "",
  quantity: 1,
  date: "",
  method: "pickup",
  line1: "",
  line2: "",
  zip: "",
  notes: "",
};

export default function OrderForm({ availability }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const openDates = availability.dates.filter((d) => d.remaining > 0);
  const selected = availability.dates.find((d) => d.date === form.date);
  const maxQty = Math.min(availability.maxPerOrder, selected ? selected.remaining : availability.maxPerOrder);

  const total = useMemo(() => {
    const loaves = form.quantity * availability.priceCents;
    return loaves + (form.method === "delivery" ? availability.deliveryFeeCents : 0);
  }, [form.quantity, form.method, availability]);

  const update = (field) => (e) => {
    const value = field === "quantity" ? Number(e.target.value) : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((er) => ({ ...er, [field === "line1" || field === "zip" ? "address" : field]: undefined }));
  };

  async function submit(e) {
    e.preventDefault();
    setMessage("");
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        quantity: form.quantity,
        date: form.date,
        method: form.method,
        notes: form.notes,
        address: form.method === "delivery" ? { line1: form.line1, line2: form.line2, zip: form.zip } : undefined,
      };
      const { checkoutUrl } = await startCheckout(payload);
      window.location.assign(checkoutUrl);
    } catch (err) {
      setErrors(err.fields || {});
      setMessage(err.message);
      setSubmitting(false);
    }
  }

  const fieldError = (key) =>
    errors[key] ? <span className="error" id={`${key}-error`}>{errors[key]}</span> : null;
  const describedBy = (key) => (errors[key] ? `${key}-error` : undefined);

  if (openDates.length === 0) {
    return (
      <div className="form-card">
        <p>All upcoming bake days are fully booked. New dates open regularly, so check back soon.</p>
      </div>
    );
  }

  return (
    <form className="form-card" onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="o-name">Name</label>
        <input id="o-name" value={form.name} onChange={update("name")} autoComplete="name" required aria-invalid={!!errors.name} aria-describedby={describedBy("name")} />
        {fieldError("name")}
      </div>

      <div className="row">
        <div className="field">
          <label htmlFor="o-email">Email</label>
          <input id="o-email" type="email" value={form.email} onChange={update("email")} autoComplete="email" required aria-invalid={!!errors.email} aria-describedby={describedBy("email")} />
          {fieldError("email")}
        </div>
        <div className="field">
          <label htmlFor="o-phone">Phone (optional)</label>
          <input id="o-phone" type="tel" value={form.phone} onChange={update("phone")} autoComplete="tel" />
        </div>
      </div>

      <div className="row">
        <div className="field">
          <label htmlFor="o-date">Date</label>
          <select id="o-date" value={form.date} onChange={update("date")} required aria-invalid={!!errors.date} aria-describedby={describedBy("date")}>
            <option value="">Choose a date</option>
            {availability.dates.map((d) => (
              <option key={d.date} value={d.date} disabled={d.remaining === 0}>
                {formatDate(d.date)}{d.remaining === 0 ? " (sold out)" : d.remaining <= 2 ? ` (${d.remaining} left)` : ""}
              </option>
            ))}
          </select>
          {fieldError("date")}
        </div>
        <div className="field">
          <label htmlFor="o-qty">Loaves</label>
          <select id="o-qty" value={form.quantity} onChange={update("quantity")} aria-invalid={!!errors.quantity} aria-describedby={describedBy("quantity")}>
            {Array.from({ length: Math.max(1, maxQty) }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          {fieldError("quantity")}
        </div>
      </div>

      <fieldset className="field">
        <legend>Pickup or delivery</legend>
        <div className="choice">
          <label><input type="radio" name="method" value="pickup" checked={form.method === "pickup"} onChange={update("method")} /> Pickup</label>
          <label><input type="radio" name="method" value="delivery" checked={form.method === "delivery"} onChange={update("method")} /> Delivery within DC</label>
        </div>
      </fieldset>

      {form.method === "delivery" && (
        <>
          <div className="field">
            <label htmlFor="o-line1">Street address</label>
            <input id="o-line1" value={form.line1} onChange={update("line1")} autoComplete="address-line1" aria-invalid={!!errors.address} aria-describedby={describedBy("address")} />
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="o-line2">Apt or unit (optional)</label>
              <input id="o-line2" value={form.line2} onChange={update("line2")} autoComplete="address-line2" />
            </div>
            <div className="field">
              <label htmlFor="o-zip">ZIP code</label>
              <input id="o-zip" inputMode="numeric" value={form.zip} onChange={update("zip")} autoComplete="postal-code" aria-invalid={!!errors.address} aria-describedby={describedBy("address")} />
            </div>
          </div>
          {fieldError("address")}
        </>
      )}

      <div className="field">
        <label htmlFor="o-notes">Notes (optional)</label>
        <textarea id="o-notes" rows="3" value={form.notes} onChange={update("notes")} />
      </div>

      <div className="total">
        <span>Total</span>
        <strong>{money(total)}</strong>
      </div>

      {message && <p className="error" role="alert">{message}</p>}

      <button className="btn btn-lg" type="submit" disabled={submitting}>
        {submitting ? "Opening checkout…" : "Continue to payment"}
      </button>
      <p className="note">You'll pay securely with Stripe. Your loaves are held for 30 minutes while you check out.</p>
    </form>
  );
}
