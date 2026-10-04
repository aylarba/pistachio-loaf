// Date helpers. All business dates are YYYY-MM-DD strings in DC local time.

export function todayInZone(timeZone, now = new Date()) {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekday(isoDate) {
  return new Date(`${isoDate}T00:00:00Z`).getUTCDay();
}

/**
 * Dates a customer may order for: starting `leadDays` from today,
 * for `windowDays` days, only on allowed bake days.
 */
export function bookableDates({ timeZone, leadDays, windowDays, bakeDays }, now = new Date()) {
  const start = addDays(todayInZone(timeZone, now), leadDays);
  const out = [];
  for (let i = 0; i < windowDays; i++) {
    const d = addDays(start, i);
    if (bakeDays.includes(weekday(d))) out.push(d);
  }
  return out;
}
