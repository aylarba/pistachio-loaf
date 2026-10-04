import { useMemo, useState } from "react";
import { placeOrder, money, formatDate } from "../api.js";

const initial = { name: "", email: "", phone: "", quantity: 1, date: "", line1: "", line2: "", zip: "", notes: "" };

function PayWithVenmo({ placed, availability }) {
  const deadline = new Date(placed.expiresAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return (
    <div className="form-card" role="status">
      <h3 className="placed-title">Almost done: pay with Venmo</h3>
      <p>
        Your loaves are held until <strong>{deadline}</strong>. Your order is confirmed once payment arrives.
      </p>
      <dl className="pay-facts">
        <div><dt>Order</dt><dd>{placed.code}</dd></div>
        <div><dt>Amount</dt><dd>{money(placed.totalCents)}</dd></div>
        <div><dt>Venmo</dt><dd>@{placed.venmoUsername}</dd></div>
      </dl>
      <a className="btn btn-lg btn-venmo" href={placed.venmoUrl} target="_blank" rel="noopener noreferrer">
        Pay {money(placed.totalCents)} with Venmo
      </a>
      <p className="note">
        The button opens Venmo with everything filled in. If it doesn't, send {money(placed.totalCents)} to
        @{placed.venmoUsername} with <strong>{placed.code}</strong> in the note.
        {availability.paymentWindowHours ? ` Unpaid orders are released after ${availability.paymentWindowHours} hours.` : ""}
      </p>
    </div>
  );
}

export default function OrderForm({ availability }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState(null);

  const openDates = availability.dates.filter((d) => d.remaining > 0);
  const selected = availability.dates.find((d) => d.date === form.date);
  const maxQty = Math.min(availability.maxPerOrder, selected ? selected.remaining : availability.maxPerOrder);
  const total = useMemo(
    () => form.quantity * availability.priceCents + availability.deliveryFeeCents,
    [form.quantity, availability]
  );

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
      const result = await placeOrder({
        name: form.name,
        email: form.email,
        phone: form.phone,
        quantity: form.quantity,
        date: form.date,
        notes: form.notes,
        address: { line1: form.line1, line2: form.line2, zip: form.zip },
      });
      setPlaced(result);
    } catch (err) {
      setErrors(err.fields || {});
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (placed) return <PayWithVenmo placed={placed} availability={availability} />;

  const fieldError = (key) => (errors[key] ? <span className="error" id={`${key}-error`}>{errors[key]}</span> : null);
  const describedBy = (key) => (errors[key] ? `${key}-error` : undefined);

  if (openDates.length === 0) {
    return (
      <div className="form-card">
        <p>All upcoming delivery days are fully booked. New dates open regularly, so check back soon.</p>
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
          <label htmlFor="o-phone">Phone</label>
          <input id="o-phone" type="tel" value={form.phone} onChange={update("phone")} autoComplete="tel" required aria-invalid={!!errors.phone} aria-describedby={describedBy("phone")} />
          {fieldError("phone")}
        </div>
      </div>

      <div className="row">
        <div className="field">
          <label htmlFor="o-date">Delivery date</label>
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

      <div className="field">
        <label htmlFor="o-line1">Delivery address (Washington, DC)</label>
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

      <div className="field">
        <label htmlFor="o-notes">Notes (optional)</label>
        <textarea id="o-notes" rows="3" value={form.notes} onChange={update("notes")} />
      </div>

      <div className="total">
        <span>Total, including {money(availability.deliveryFeeCents)} delivery</span>
        <strong>{money(total)}</strong>
      </div>

      {message && <p className="error" role="alert">{message}</p>}

      <button className="btn btn-lg" type="submit" disabled={submitting}>
        {submitting ? "Placing order…" : "Place order"}
      </button>
      <p className="note">Next, you'll pay with Venmo. Your loaves are held while you pay.</p>
    </form>
  );
}
