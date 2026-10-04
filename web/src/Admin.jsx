// Baker's order list. Open the site with #admin at the end of the address.
import { useEffect, useState } from "react";
import { adminList, adminSetStatus, money, formatDate, demoMode } from "./api.js";

const TABS = [
  { id: "awaiting_payment", label: "Waiting for Venmo" },
  { id: "paid", label: "Paid, to deliver" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
  { id: "expired", label: "Expired" },
];

const ACTIONS = {
  awaiting_payment: [
    { to: "paid", label: "Mark paid" },
    { to: "cancelled", label: "Cancel", confirm: "Cancel this order and release its loaves?" },
  ],
  paid: [
    { to: "delivered", label: "Mark delivered" },
    { to: "cancelled", label: "Cancel", confirm: "Cancel this paid order? Remember to refund it in Venmo." },
  ],
};

const KEY_STORE = "lowzineh-admin-key";

export default function Admin() {
  const [key, setKey] = useState(() => sessionStorage.getItem(KEY_STORE) || "");
  const [draftKey, setDraftKey] = useState("");
  const [tab, setTab] = useState("awaiting_payment");
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load(k = key, t = tab) {
    if (!k) return;
    setLoading(true);
    setError("");
    try {
      const { orders } = await adminList(k, t);
      setOrders(t === "awaiting_payment" ? orders : [...orders].sort((a, b) => a.date.localeCompare(b.date)));
    } catch (err) {
      if (err.status === 401) {
        sessionStorage.removeItem(KEY_STORE);
        setKey("");
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [key, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  async function act(order, action) {
    if (action.confirm && !window.confirm(action.confirm)) return;
    try {
      await adminSetStatus(key, order.code, action.to);
      setOrders((list) => list.filter((o) => o.code !== order.code));
    } catch (err) {
      setError(err.message);
    }
  }

  if (demoMode) {
    return <main className="wrap admin"><h1>Orders</h1><p>The order list works once the API is connected.</p></main>;
  }

  if (!key) {
    return (
      <main className="wrap admin">
        <h1>Orders</h1>
        <form
          className="form-card admin-login"
          onSubmit={(e) => {
            e.preventDefault();
            sessionStorage.setItem(KEY_STORE, draftKey);
            setKey(draftKey);
          }}
        >
          <div className="field">
            <label htmlFor="admin-key">Admin key</label>
            <input id="admin-key" type="password" value={draftKey} onChange={(e) => setDraftKey(e.target.value)} autoComplete="current-password" />
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn" type="submit">Open orders</button>
        </form>
      </main>
    );
  }

  return (
    <main className="wrap admin">
      <div className="admin-head">
        <h1>Orders</h1>
        <div className="admin-tools">
          <button className="btn btn-quiet" type="button" onClick={() => load()}>Refresh</button>
          <button className="btn btn-quiet" type="button" onClick={() => { sessionStorage.removeItem(KEY_STORE); setKey(""); }}>Sign out</button>
        </div>
      </div>

      <nav className="tabs" aria-label="Order status">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={t.id === tab ? "tab tab-on" : "tab"} aria-pressed={t.id === tab} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      {error && <p className="error" role="alert">{error}</p>}
      {loading ? (
        <p className="note">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="note">No orders here.</p>
      ) : (
        <ul className="order-list">
          {orders.map((o) => (
            <li key={o.code} className="panel order-item">
              <div className="order-top">
                <strong>{o.code}</strong>
                <span>{formatDate(o.date)} · {o.quantity} {o.quantity > 1 ? "loaves" : "loaf"} · {money(o.totalCents)}</span>
              </div>
              <p>{o.name} · <a href={`tel:${o.phone}`}>{o.phone}</a> · <a href={`mailto:${o.email}`}>{o.email}</a></p>
              <p>{o.address.line1}{o.address.line2 ? `, ${o.address.line2}` : ""}, DC {o.address.zip}</p>
              {o.notes && <p className="small">Note: {o.notes}</p>}
              {tab === "awaiting_payment" && (
                <p className="small">Held until {new Date(o.expiresAt).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" })}</p>
              )}
              <div className="order-actions">
                {(ACTIONS[tab] || []).map((a) => (
                  <button key={a.to} type="button" className={a.to === "cancelled" ? "btn btn-quiet" : "btn"} onClick={() => act(o, a)}>
                    {a.label}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
