// All runtime settings come from environment variables set in template.yaml.
const num = (name, fallback) => {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Env ${name} must be a number`);
  return n;
};

export const config = {
  tableName: process.env.TABLE_NAME,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  siteUrl: (process.env.SITE_URL || "http://localhost:5173").replace(/\/$/, ""),
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  ownerEmail: process.env.OWNER_EMAIL,
  fromEmail: process.env.FROM_EMAIL,
  productName: process.env.PRODUCT_NAME || "Pistachio & Cardamom Upside-Down Loaf",
  priceCents: num("PRICE_CENTS", 2400),
  deliveryFeeCents: num("DELIVERY_FEE_CENTS", 500),
  dailyCapacity: num("DAILY_CAPACITY", 6),
  leadDays: num("LEAD_DAYS", 2),
  bookingWindowDays: num("BOOKING_WINDOW_DAYS", 21),
  maxPerOrder: num("MAX_PER_ORDER", 4),
  // 0 = Sunday ... 6 = Saturday
  bakeDays: (process.env.BAKE_DAYS || "0,1,2,3,4,5,6")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6),
  timeZone: "America/New_York",
};
