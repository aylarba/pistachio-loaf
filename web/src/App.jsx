import { useEffect, useState } from "react";
import { site } from "./site.js";
import { getAvailability, money, demoMode } from "./api.js";
import OrderForm from "./components/OrderForm.jsx";

const BASE = import.meta.env.BASE_URL;

const FLAVORS = [
  { fa: "پسته", en: "Pistachio", line: "Ground fine into the batter, so every bite tastes of it." },
  { fa: "هل", en: "Cardamom", line: "Whole seeds, crushed by hand just before baking." },
  { fa: "عسل", en: "Honey", line: "The only sweetener. It keeps the crumb soft for days." },
  { fa: "بادام", en: "Almond", line: "Almond flour inside, caramelized almonds on top." },
];

export default function App() {
  const [availability, setAvailability] = useState(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    getAvailability().then(setAvailability).catch((e) => setLoadError(e.message));
  }, []);

  const price = availability ? money(availability.priceCents) : "";
  const fee = availability ? money(availability.deliveryFeeCents) : "";

  return (
    <>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <a className="wordmark" href={BASE}>
            <span lang="fa" dir="rtl" className="wordmark-fa">لوزینه</span>
            <span className="wordmark-en">{site.bakeryName}</span>
          </a>
          <nav aria-label="Main">
            <a href="#flavors">The loaf</a>
            <a href="#inside">Ingredients</a>
            <a className="btn btn-small" href="#order">Order</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero lattice">
          <span className="hero-script" lang="fa" dir="rtl" aria-hidden="true">لوزینه</span>
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <p className="kicker">Baked to order in Washington, DC</p>
              <h1>
                <span className="h1-name">Lowzineh</span>
                <span className="h1-sub">Pistachio &amp; cardamom upside-down loaf, sweetened only with honey</span>
              </h1>
              <p className="say">Say it <em>low-ZEE-neh</em>, after the Persian almond sweet.</p>
              <div className="buy">
                <a className="btn btn-lg" href="#order">Order a loaf</a>
                {fee && <span className="buy-note">{fee} delivery anywhere in DC</span>}
              </div>
            </div>

            <div className="hero-art">
              <div className="diamond-photo">
                {site.photo ? (
                  <img src={`${BASE}${site.photo}`} alt={site.photoAlt} />
                ) : (
                  <span className="photo-placeholder">[Photo of your loaf]</span>
                )}
              </div>
              {price && (
                <div className="price-gem" aria-label={`${price} a loaf`}>
                  <span>{price}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="flavors" className="flavors">
          <div className="wrap">
            <h2>Four things, done carefully</h2>
            <ul className="flavor-grid">
              {FLAVORS.map((f) => (
                <li key={f.en} className="flavor">
                  <span className="gem" aria-hidden="true"><span lang="fa" dir="rtl">{f.fa}</span></span>
                  <h3>{f.en}</h3>
                  <p>{f.line}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="story">
          <div className="wrap story-grid">
            <div className="arch">
              <img src={`${BASE}loaf-slice.jpg`} alt="A slice of the loaf showing its tender, pistachio-flecked crumb" />
            </div>
            <div className="story-copy">
              <h2>Named for a sweet cut into diamonds</h2>
              <p>
                <em>Lowzineh</em> (لوزینه) is the Persian almond and pistachio sweet, traditionally cut into small
                diamonds and served with tea. This loaf carries the same flavors in a softer form.
              </p>
              <p>
                It bakes upside down: sliced almonds and honey line the pan, then the batter goes on top. When the loaf
                is turned out, the almonds have become a glossy, caramelized crown.
              </p>
            </div>
          </div>
        </section>

        <section id="order" className="order">
          <div className="wrap order-grid">
            <div className="order-copy">
              <h2>Order a loaf</h2>
              <ol className="steps">
                <li><span><strong>Pick a delivery day.</strong> Every loaf is baked fresh for it.</span></li>
                <li><span><strong>Tell us where.</strong> Delivery is {fee || "a flat fee"}, anywhere in Washington, DC.</span></li>
                <li><span><strong>Pay with Venmo.</strong> The amount and your order code are filled in for you.</span></li>
              </ol>
              {demoMode && <p className="note">Online ordering opens soon.</p>}
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

        <section id="inside" className="inside lattice">
          <div className="wrap inside-grid">
            <div>
              <h2>What's inside</h2>
              <p>{site.ingredients}</p>
              <p className="allergen">{site.allergens}</p>
              <p className="small">Made in a home kitchen that may also handle wheat, peanuts and other allergens.</p>
            </div>
            <dl className="facts">
              <div><dt>Size</dt><dd>8 x 4 inch loaf, about 6 slices</dd></div>
              <div><dt>Keeps</dt><dd>3 to 4 days, wrapped, at room temperature</dd></div>
              <div><dt>Serve with</dt><dd>Tea, coffee, or plain yogurt</dd></div>
              <div><dt>Delivery</dt><dd>Anywhere in Washington, DC</dd></div>
            </dl>
          </div>
        </section>
      </main>

      <div className="signoff" aria-hidden="true">
        <span lang="fa" dir="rtl">لوزینه</span>
      </div>
    </>
  );
}
