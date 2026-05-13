import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Tag, Check } from "lucide-react";
import Layout from "@/components/Layout";
import Stepper from "@/components/Stepper";
import { useBooking, calcNights } from "@/context/BookingContext";

const Review = () => {
  const nav = useNavigate();
  const { selectedHotel, selectedRoom, search, guest, promo, applyPromo, user } = useBooking();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [availableCodes, setAvailableCodes] = useState<string[]>(["LUXE10", "WELCOME15", "VIP20"]);

  useEffect(() => { if (!selectedHotel || !selectedRoom || !guest) nav("/hotels"); }, [selectedHotel, selectedRoom, guest, nav]);

  // Fetch which promo codes are valid for this user
  useEffect(() => {
    if (!user?.email) return;
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    // Check each code to see if it's valid for this user
    Promise.all([
      fetch(`${base}/promo/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "LUXE10", subtotal: 0, userEmail: user.email }),
      }).then(r => r.json()).then(j => j?.valid ? "LUXE10" : null),
      fetch(`${base}/promo/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "WELCOME15", subtotal: 0, userEmail: user.email }),
      }).then(r => r.json()).then(j => j?.valid ? "WELCOME15" : null),
      fetch(`${base}/promo/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "VIP20", subtotal: 0, userEmail: user.email }),
      }).then(r => r.json()).then(j => j?.valid ? "VIP20" : null),
    ]).then((results) => {
      const valid = results.filter(Boolean) as string[];
      setAvailableCodes(valid.length > 0 ? valid : []);
    }).catch(() => {});
  }, [user?.email]);

  if (!selectedHotel || !selectedRoom || !guest) return null;

  const nights = calcNights(search.checkIn, search.checkOut);
  const subtotal = selectedRoom.price * nights;
  const serviceFee = Math.round(subtotal * 0.05);
  const taxes = Math.round(subtotal * 0.08);
  const discount = promo ? Math.round(subtotal * (promo.pct / 100)) : 0;
  const total = subtotal + serviceFee + taxes - discount;

  const apply = async () => {
    const cleaned = code.replace(/\s+/g, "").toUpperCase();
    if (!cleaned) { setMsg({ type: "err", text: "Please enter a promo code." }); return; }
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    try {
      const res = await fetch(`${base}/promo/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cleaned, subtotal, userEmail: user?.email || "" }),
      });
      const json = await res.json();
      // The /promo/validate endpoint returns fields at the top level (not nested under data)
      if (json?.valid) {
        await applyPromo(cleaned);
        setMsg({ type: "ok", text: `${cleaned} applied — ${json.description}!` });
      } else {
        setMsg({ type: "err", text: json?.message || "Invalid promo code." });
      }
    } catch {
      setMsg({ type: "err", text: "Could not validate promo code. Try again." });
    }
  };

  return (
    <Layout>
      <div className="container py-8">
        <Stepper current={2} />
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Review Your Booking</h1>
        <p className="text-muted-foreground mb-8">Please confirm your details before proceeding to payment.</p>

        <div className="grid lg:grid-cols-[1fr_400px] gap-8">
          <div className="space-y-6">
            <Card title="Stay Summary">
              <div className="flex gap-4">
                <img src={selectedHotel.image} alt="" className="w-32 h-32 object-cover rounded-xl" />
                <div className="flex-1">
                  <h3 className="font-display text-xl font-bold">{selectedHotel.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedHotel.location}</p>
                  <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                    <Row label="Check-in" value={search.checkIn} />
                    <Row label="Check-out" value={search.checkOut} />
                    <Row label="Room" value={selectedRoom.name} />
                    <Row label="Guests" value={`${search.guests} · ${nights} nights`} />
                  </div>
                </div>
              </div>
            </Card>
            <Card title="Guest Information">
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <Row label="Name" value={guest.name} />
                <Row label="Email" value={guest.email} />
                <Row label="Phone" value={guest.phone} />
                {guest.specialRequests && <Row label="Special Requests" value={guest.specialRequests} />}
              </div>
            </Card>
          </div>

          <aside className="bg-card border border-border rounded-2xl p-6 h-fit lg:sticky lg:top-20">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-4">Price Summary</h3>
            <div className="space-y-2.5 text-sm">
              <Line label={`${selectedRoom.name} (${nights} nights)`} value={`$${subtotal.toLocaleString()}`} />
              <Line label="Service Fee" value={`$${serviceFee}`} />
              <Line label="Taxes" value={`$${taxes}`} />
              {discount > 0 && <Line label={`Discount (${promo!.code})`} value={`-$${discount}`} accent />}
            </div>
            <div className="mt-5 pt-5 border-t border-border">
              <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Promo Code</label>
              <div className="flex gap-2 mt-2">
                <input value={code} onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && apply()}
                  placeholder={availableCodes[0] || "Enter code"}
                  className="flex-1 px-3 py-2 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm" />
                <button type="button" onClick={apply} className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold transition-base">Apply</button>
              </div>
              {msg && (
                <p className={`text-xs mt-2 flex items-center gap-1 font-medium ${msg.type === "ok" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                  {msg.type === "ok" && <Check className="w-3 h-3" />} {msg.text}
                </p>
              )}
              {availableCodes.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {availableCodes.map((c) => (
                    <button key={c} type="button"
                      onClick={() => { setCode(c); setMsg(null); }}
                      className="text-[11px] font-semibold bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 rounded-full hover:bg-accent/20 transition-base">
                      {c}
                    </button>
                  ))}
                  <span className="text-[11px] text-muted-foreground self-center">— click to apply</span>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground mt-2">No promo codes available for your account.</p>
              )}
            </div>
            <div className="mt-5 pt-5 border-t border-border">
              <div className="flex items-end justify-between mb-4">
                <span className="text-sm font-semibold text-primary">Total Amount</span>
                <span className="font-display text-3xl font-bold text-primary">${total.toLocaleString()}</span>
              </div>
              <button onClick={() => nav("/payment")}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-base">
                Continue to Payment <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
};

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-card border border-border rounded-2xl p-6">
    <h3 className="font-display text-lg font-bold mb-4">{title}</h3>
    {children}
  </div>
);
const Row = ({ label, value }: { label: string; value: string }) => (
  <div><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium text-primary">{value}</p></div>
);
const Line = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div className="flex justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className={accent ? "text-accent font-semibold" : "text-primary font-medium"}>{value}</span>
  </div>
);

export default Review;
