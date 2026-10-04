// Lowzineh mobile app (Expo / React Native).
// Uses the same API as the website. After ordering, it opens Venmo to pay.
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { StatusBar } from "expo-status-bar";

const API_URL = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/$/, "");

const C = {
  ground: "#F4F1E8", ink: "#1F2A1F", muted: "#4A544A", pistachio: "#4E6B2E",
  pale: "#E6E9D6", rose: "#8E3446", line: "#8A9485", white: "#FFFFFF",
};

const money = (cents) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
const formatDate = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

function Choice({ label, selected, disabled, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={[s.chip, selected && s.chipOn, disabled && s.chipOff]}
    >
      <Text style={[s.chipText, selected && s.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

function Field({ label, error, ...props }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput style={[s.input, error && s.inputError]} placeholderTextColor={C.muted} {...props} />
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", date: "", quantity: 1, line1: "", line2: "", zip: "", notes: "" });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState(null);

  useEffect(() => {
    if (!API_URL) { setLoadError("Set EXPO_PUBLIC_API_URL to your API address."); return; }
    fetch(`${API_URL}/availability`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then(setData)
      .catch(() => setLoadError("Could not load available dates. Pull to retry later."));
  }, []);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };
  const selected = data?.dates.find((d) => d.date === form.date);
  const maxQty = data ? Math.min(data.maxPerOrder, selected ? selected.remaining : data.maxPerOrder) : 1;
  const total = useMemo(
    () => (data ? form.quantity * data.priceCents + data.deliveryFeeCents : 0),
    [data, form.quantity]
  );

  async function placeOrder() {
    setBusy(true); setMessage("");
    try {
      const res = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name, email: form.email, phone: form.phone, date: form.date,
          quantity: form.quantity, notes: form.notes,
          address: { line1: form.line1, line2: form.line2, zip: form.zip },
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setErrors(body.fields || {}); setMessage(body.error || "Something went wrong."); return; }
      setPlaced(body);
      Linking.openURL(body.venmoUrl).catch(() => {});
    } catch {
      setMessage("No connection. Check your internet and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
        <Text style={s.where}>Baked to order in Washington, DC</Text>
        <Text style={s.brand}>Lowzineh</Text>
        <Text style={s.h1}>Pistachio & Cardamom Upside-Down Loaf</Text>
        <Text style={s.body}>
          Almond flour, ground pistachios and fresh cardamom, sweetened only with honey and topped with caramelized almonds.
        </Text>
        {data ? <Text style={s.price}>{money(data.priceCents)} a loaf</Text> : null}
        <Text style={s.allergen}>Contains: tree nuts (almond, pistachio), eggs, milk.</Text>

        <View style={s.card}>
          {placed ? (
            <>
              <Text style={s.price}>Almost done: pay with Venmo</Text>
              <Text style={s.body}>Order {placed.code} · {money(placed.totalCents)}</Text>
              <Text style={s.body}>Send {money(placed.totalCents)} to @{placed.venmoUsername} with {placed.code} in the note. Your loaves are held for a few hours.</Text>
              <Pressable style={[s.btn, s.btnVenmo]} onPress={() => Linking.openURL(placed.venmoUrl)} accessibilityRole="button">
                <Text style={s.btnText}>Pay {money(placed.totalCents)} with Venmo</Text>
              </Pressable>
            </>
          ) : loadError ? <Text style={s.error}>{loadError}</Text> : !data ? <ActivityIndicator color={C.pistachio} /> : (
            <>
              <Text style={s.label}>Date</Text>
              <View style={s.wrapRow}>
                {data.dates.map((d) => (
                  <Choice key={d.date} label={d.remaining ? formatDate(d.date) : `${formatDate(d.date)} · sold out`}
                    selected={form.date === d.date} disabled={!d.remaining}
                    onPress={() => { set("date", d.date); set("quantity", Math.min(form.quantity, d.remaining)); }} />
                ))}
              </View>
              {errors.date ? <Text style={s.error}>{errors.date}</Text> : null}

              <Text style={[s.label, s.gap]}>Loaves</Text>
              <View style={s.wrapRow}>
                {Array.from({ length: Math.max(1, maxQty) }, (_, i) => i + 1).map((n) => (
                  <Choice key={n} label={String(n)} selected={form.quantity === n} onPress={() => set("quantity", n)} />
                ))}
              </View>

              <Field label="Name" value={form.name} onChangeText={(v) => set("name", v)} autoComplete="name" error={errors.name} />
              <Field label="Email" value={form.email} onChangeText={(v) => set("email", v)} autoComplete="email" keyboardType="email-address" autoCapitalize="none" error={errors.email} />
              <Field label="Phone" value={form.phone} onChangeText={(v) => set("phone", v)} autoComplete="tel" keyboardType="phone-pad" error={errors.phone} />
              <Field label="Delivery address (Washington, DC)" value={form.line1} onChangeText={(v) => set("line1", v)} autoComplete="street-address" error={errors.address} />
              <Field label="Apt or unit (optional)" value={form.line2} onChangeText={(v) => set("line2", v)} />
              <Field label="ZIP code" value={form.zip} onChangeText={(v) => set("zip", v)} keyboardType="number-pad" autoComplete="postal-code" />
              <Field label="Notes (optional)" value={form.notes} onChangeText={(v) => set("notes", v)} multiline />

              <View style={s.total}><Text style={s.body}>Total</Text><Text style={s.totalNum}>{money(total)}</Text></View>
              {message ? <Text style={s.error}>{message}</Text> : null}
              <Pressable style={[s.btn, busy && { opacity: 0.7 }]} onPress={placeOrder} disabled={busy} accessibilityRole="button">
                <Text style={s.btnText}>{busy ? "Placing order…" : "Place order"}</Text>
              </Pressable>
              <Text style={s.note}>Delivery within Washington, DC only. You'll pay with Venmo next.</Text>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.ground },
  page: { padding: 22, gap: 12 },
  brand: { fontSize: 22, fontWeight: "700", color: C.ink, fontFamily: "Georgia" },
  where: { color: C.rose, fontWeight: "600" },
  h1: { fontSize: 36, lineHeight: 40, fontWeight: "700", color: C.ink, fontFamily: "Georgia" },
  body: { fontSize: 17, lineHeight: 25, color: C.ink },
  price: { fontSize: 24, fontWeight: "700", color: C.ink, fontFamily: "Georgia" },
  allergen: { fontSize: 15, fontWeight: "600", color: C.ink },
  card: { backgroundColor: C.white, borderRadius: 22, padding: 20, gap: 10, marginTop: 8 },
  label: { fontSize: 16, fontWeight: "600", color: C.ink },
  gap: { marginTop: 8 },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 14, justifyContent: "center", borderRadius: 999, borderWidth: 1, borderColor: C.line },
  chipOn: { backgroundColor: C.pistachio, borderColor: C.pistachio },
  chipOff: { opacity: 0.45 },
  chipText: { color: C.ink, fontSize: 15 },
  chipTextOn: { color: C.white, fontWeight: "600" },
  field: { gap: 6, marginTop: 6 },
  input: { borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: C.ink },
  inputError: { borderColor: C.rose },
  error: { color: C.rose, fontSize: 15, fontWeight: "500" },
  total: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", borderTopWidth: 1, borderTopColor: C.pale, paddingTop: 12, marginTop: 6 },
  totalNum: { fontSize: 26, fontWeight: "700", color: C.ink, fontFamily: "Georgia" },
  btn: { backgroundColor: C.pistachio, borderRadius: 999, minHeight: 52, alignItems: "center", justifyContent: "center" },
  btnVenmo: { backgroundColor: "#0B6FB8" },
  btnText: { color: C.white, fontSize: 17, fontWeight: "600" },
  note: { fontSize: 14, color: C.muted },
});
