import { useEffect, useState } from "react";
import { site } from "./site.js";
import { getAvailability, money, demoMode } from "./api.js";
import OrderForm from "./components/OrderForm.jsx";

function useOrderStatus() {
  const [status] = useState(() => new URLSearchParams(window.location.search).get("order"));
  return status; // "success" | "cancelled" | null
}

export default function App() {
  const [availability, setAvailability] = useState(null);
  const [loadError, setLoadError] = useState("");
  const status = useOrderStatus();

  useEffect(() => {
    getAvailability()
      .then(setAvailability)
      .catch((e) => setLoadError(e.message));
  }, []);

  const price = availability ? money(availability.priceCents) : "";

  return (
    <>
      <header className="wrap site-header">
        <a className="brand" href="/">{site.bakeryName}</a>
        <nav aria-label="Main">
          <a href="#story">The loaf</a>
          <a href="#ingredients">Ingredients</a>
          <a className="btn" href="#order">Order</a>
        </nav>
      </header>

      {status === "success" && (
        <div className="banner banner-ok" role="status">
          <div className="wrap">Thank you! Your order is confirmed. A receipt is on its way to your email.</div>
        </div>
      )}
      {status === "cancelled" && (
        <div className="banner" role="status">
          <div className="wrap">Checkout was cancelled and you weren't charged. Your details are below if you'd like to try again.</div>
        </div>
      )}

      <main>
        <section className="wrap hero">
          <div className="hero-text">
            <p className="where">Baked to order in Washington, DC</p>
            <h1>Pistachio &amp; Cardamom Upside-Down Loaf</h1>
            <p className="lede">
              A tender almond-flour loaf with ground pistachios and freshly crushed cardamom, sweetened only
              with honey and crowned with caramelized sliced almonds.
            </p>
            <div className="buy">
              <a className="btn btn-lg" href="#order">Order a loaf</a>
              {price && <span className="price">{price}</span>}
            </div>
          </div>
          <div className="photo">
            {site.photo ? <img src={site.photo} alt={site.photoAlt} /> : <span>[Photo of your loaf, almond side up]</span>}
          </div>
        </section>

        <section id="story" className="story">
          <div className="wrap">
            <div>
              <h3>Pistachio &amp; cardamom</h3>
              <p>Flavors from Persian baking: pistachios ground fine into the batter, and cardamom seeds crushed by hand just before baking.</p>
            </div>
            <div>
              <h3>Sweetened with honey</h3>
              <p>No granulated sugar. Honey keeps the crumb moist and gives the almond topping a soft, golden finish.</p>
            </div>
            <div>
              <h3>Made with almond flour</h3>
              <p>No wheat flour. The result is dense, tender and rich, closer to a French financier than a sponge.</p>
            </div>
          </div>
        </section>

        <section id="ingredients" className="wrap info">
          <div>
            <h2>What's inside</h2>
            <p>{site.ingredients}</p>
            <div className="panel">
              <p className="allergen">{site.allergens}</p>
              <p className="small">Made in a home kitchen that may also handle wheat, peanuts and other allergens.</p>
            </div>
          </div>
          <div>
            <h2>The details</h2>
            <dl className="facts">
              <div className="panel"><dt>Size</dt><dd>8 x 4 inch loaf, about 6 slices</dd></div>
              <div className="panel"><dt>Net weight</dt><dd>{site.netWeight}</dd></div>
              <div className="panel"><dt>Keeps</dt><dd>3 to 4 days, wrapped, at room temperature</dd></div>
              <div className="panel"><dt>Serve with</dt><dd>Tea, coffee, or plain yogurt</dd></div>
            </dl>
          </div>
        </section>

        <section id="order" className="order">
          <div className="wrap">
            <div className="order-text">
              <h2>Order a loaf</h2>
              <p>Every loaf is baked to order. Pickup and delivery are available within Washington, DC only.</p>
              <p>
                <strong>Pickup:</strong> {site.pickup}<br />
                <strong>Delivery:</strong> {site.delivery}
                {availability?.deliveryFeeCents ? ` (${money(availability.deliveryFeeCents)} fee)` : ""}
              </p>
              {demoMode && (
                <p className="note">Online ordering opens soon. Until then, email {site.email} to order.</p>
              )}
            </div>
            {loadError ? (
              <div className="form-card"><p className="error">{loadError}</p></div>
            ) : availability ? (
              <OrderForm availability={availability} />
            ) : (
              <div className="form-card"><p className="note">Loading available dates…</p></div>
            )}
          </div>
        </section>
      </main>

      <footer className="wrap">
        <p><strong>Made by a cottage food business that is not subject to the District of Columbia's food safety regulations.</strong></p>
        <p>Cottage Food Business ID: {site.cottageFoodId}</p>
        <p>
          {site.email}
          {" | "}
          {site.instagram ? <a href={site.instagram}>{site.instagramHandle}</a> : site.instagramHandle}
        </p>
      </footer>
    </>
  );
}
