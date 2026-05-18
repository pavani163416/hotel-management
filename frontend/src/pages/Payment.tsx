import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CreditCard, Smartphone, Building2, Lock,
  AlertCircle, Loader2, CheckCircle2, ShieldCheck, Info,
} from "lucide-react";
import Layout from "@/components/Layout";
import Stepper from "@/components/Stepper";
import { useBooking, calcNights, Booking } from "@/context/BookingContext";
import { createBooking } from "@/services/api";

type Method = "card" | "upi" | "netbanking";

const ID_TYPES = [
  { value: "aadhaar",  label: "Aadhaar Card" },
  { value: "passport", label: "Passport" },
  { value: "pan",      label: "PAN Card" },
  { value: "dl",       label: "Driving Licence" },
  { value: "voter",    label: "Voter ID" },
];

const Payment = () => {
  const nav = useNavigate();
  const { selectedHotel, selectedRoom, search, guest, promo, addBooking, user } = useBooking();

  const [method, setMethod]         = useState<Method>("card");
  const [card, setCard]             = useState({ number: "", name: "", expiry: "", cvv: "" });
  const [upi, setUpi]               = useState("");
  const [bank, setBank]             = useState("");
  const [billingRep, setBillingRep] = useState("");
  const [idType, setIdType]         = useState("aadhaar");
  const [govtId, setGovtId]         = useState("");
  const [error, setError]           = useState("");
  const [processing, setProcessing] = useState(false);
  const [savedToDb, setSavedToDb]   = useState(false);

  useEffect(() => {
    if (!selectedHotel || !selectedRoom || !guest) nav("/hotels");
  }, [selectedHotel, selectedRoom, guest, nav]);

  if (!selectedHotel || !selectedRoom || !guest) return null;

  const nights     = calcNights(search.checkIn, search.checkOut);
  const subtotal   = selectedRoom.price * nights;
  const serviceFee = Math.round(subtotal * 0.05);
  const taxes      = Math.round(subtotal * 0.08);
  const discount   = promo ? Math.round(subtotal * (promo.pct / 100)) : 0;
  const total      = subtotal + serviceFee + taxes - discount;

  const allGuests = [
    guest.name,
    ...(guest.adults?.map((a) => a.name) || []),
  ].filter(Boolean);

  const validate = () => {
    if (!billingRep)    return "Please select the primary guest for billing.";
    if (!govtId.trim()) return "Government ID number is required for check-in verification.";
    if (method === "card") {
      if (!/^\d{12,19}$/.test(card.number.replace(/\s/g, ""))) return "Invalid card number";
      if (!card.name.trim()) return "Cardholder name required";
      if (!/^\d{2}\/\d{2}$/.test(card.expiry)) return "Expiry must be MM/YY";
      if (!/^\d{3,4}$/.test(card.cvv)) return "Invalid CVV";
    }
    if (method === "upi" && !/^[\w.-]+@[\w]+$/.test(upi)) return "Invalid UPI ID";
    if (method === "netbanking" && !bank) return "Please select a bank";
    return "";
  };

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (processing) return; // prevent double submission
    const v = validate();
    if (v) { setError(v); return; }

    if (method === "card" && card.number.replace(/\s/g, "").endsWith("0000")) {
      setError("Payment declined by bank. Please try a different card.");
      return;
    }

    setError("");
    setProcessing(true);

    try {
      if (selectedRoom.id === "default") {
        setError("No valid room selected. Please choose a booking-ready room and try again.");
        setProcessing(false);
        return;
      }

      let mongoBookingId: string | null = null;
      try {
        const response = await createBooking({
          roomId:         selectedRoom.id,
          roomNumber:     selectedRoom.id,
          guest:          { name: guest.name, email: user?.email || guest.email, phone: guest.phone, city: "" },
          checkIn:        search.checkIn,
          checkOut:       search.checkOut,
          pricePerNight:  selectedRoom.price,
          subtotal:       subtotal,
          taxes:          taxes + serviceFee,
          discount:       discount,
          totalAmount:    total,
          promoCode:      promo?.code,
          paymentMethod:  method,
          specialRequests: guest.specialRequests || "",
          additionalAdults:   guest.adults || [],
          additionalChildren: guest.children?.map((c) => ({ name: c.name, age: c.age })) || [],
          hotelName:      selectedHotel.name,
        });
        mongoBookingId = response.data._id;
        setSavedToDb(true);
      } catch (bookingErr: any) {
        // Surface real errors (room unavailable, etc.) — don't silently proceed
        const msg = bookingErr?.message || "";
        if (msg.toLowerCase().includes("room") || msg.toLowerCase().includes("unavailable") || msg.toLowerCase().includes("booked")) {
          setError(msg || "This room is no longer available. Please select a different room.");
          setProcessing(false);
          return;
        }
        // Network/server error — still proceed with local booking so user isn't stuck
        setSavedToDb(false);
      }

      const booking: Booking = {
        id: mongoBookingId || ("LS-" + Math.floor(10000 + Math.random() * 90000)),
        hotel: selectedHotel, room: selectedRoom, search,
        guest: { ...guest, email: user?.email || guest.email },
        nights, subtotal, taxes: taxes + serviceFee, discount, total,
        status: "Confirmed", createdAt: new Date().toISOString(),
      };

      addBooking(booking);
      nav("/confirmation");
    } catch (err: any) {
      setError(err.message || "Payment failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Layout>
      <div className="container py-8">
        <Stepper current={3} />
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Payment</h1>
        <p className="text-muted-foreground mb-8 flex items-center gap-1.5">
          <Lock className="w-4 h-4" /> Secure 256-bit SSL encrypted
        </p>

        {savedToDb && (
          <div className="mb-6 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Booking saved to database — your reservation is secured.
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          <form onSubmit={pay} className="space-y-6">

            {/* ── Guest Identity Verification ───────────── */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                <div>
                  <h2 className="font-semibold text-primary">Guest Identity Verification</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Required by Indian hotel regulations (MHA guidelines). Your ID is used for check-in only and is not stored digitally.
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                  Primary Guest (Billing Responsible)
                </p>
                <div className="space-y-2">
                  {allGuests.map((name, i) => (
                    <label key={i}
                      className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-base ${billingRep === name ? "border-accent bg-accent/5" : "border-border hover:bg-accent/5"}`}>
                      <input type="radio" name="billingRep" value={name}
                        checked={billingRep === name} onChange={() => setBillingRep(name)}
                        className="w-4 h-4 accent-accent" />
                      <span className="font-medium text-sm">{name}</span>
                      {i === 0 && <span className="ml-auto text-[10px] bg-accent/15 text-accent px-2 py-0.5 rounded-full font-semibold">Lead Guest</span>}
                    </label>
                  ))}
                </div>
              </div>

              {billingRep && (
                <div className="pt-4 border-t border-border space-y-4 animate-in fade-in slide-in-from-top-2">
                  <Field label="ID Type">
                    <select value={idType} onChange={(e) => setIdType(e.target.value)} className="input">
                      {ID_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label={(ID_TYPES.find(t => t.value === idType)?.label ?? "ID") + " Number"}>
                    <input type="text" value={govtId} onChange={(e) => setGovtId(e.target.value)}
                      placeholder={
                        idType === "aadhaar"  ? "XXXX XXXX XXXX" :
                        idType === "pan"      ? "ABCDE1234F" :
                        idType === "passport" ? "A1234567" : "Enter ID number"
                      }
                      className="input" autoComplete="off" />
                  </Field>
                  <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    As per Ministry of Home Affairs guidelines, hotels are required to collect a valid government-issued photo ID at check-in.
                  </p>
                </div>
              )}
            </div>

            {/* ── Payment Method Tabs ────────────────────── */}
            <div className="grid grid-cols-3 gap-3">
              <MethodBtn active={method === "card"}       onClick={() => setMethod("card")}       icon={<CreditCard />} label="Card" />
              <MethodBtn active={method === "upi"}        onClick={() => setMethod("upi")}        icon={<Smartphone />} label="UPI" />
              <MethodBtn active={method === "netbanking"} onClick={() => setMethod("netbanking")} icon={<Building2 />}  label="Net Banking" />
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              {method === "card" && (
                <>
                  <Field label="Card Number">
                    <input value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} placeholder="1234 5678 9012 3456" className="input" />
                  </Field>
                  <Field label="Cardholder Name">
                    <input value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} placeholder="John Doe" className="input" />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Expiry">
                      <input value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })} placeholder="MM/YY" className="input" />
                    </Field>
                    <Field label="CVV">
                      <input type="password" value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value })} placeholder="123" className="input" />
                    </Field>
                  </div>
                </>
              )}
              {method === "upi" && (
                <Field label="UPI ID">
                  <input value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="yourname@bank" className="input" />
                </Field>
              )}
              {method === "netbanking" && (
                <Field label="Select Bank">
                  <select value={bank} onChange={(e) => setBank(e.target.value)} className="input">
                    <option value="">Choose your bank</option>
                    <option>HDFC Bank</option>
                    <option>SBI</option>
                    <option>ICICI Bank</option>
                    <option>Axis Bank</option>
                    <option>Kotak Mahindra</option>
                    <option>HSBC</option>
                    <option>Barclays</option>
                    <option>Chase</option>
                    <option>Bank of America</option>
                  </select>
                </Field>
              )}

              {error && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
                </div>
              )}

              <button type="submit"
                disabled={processing || !billingRep || !govtId.trim()}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-70 text-primary-foreground py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-base">
                {processing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                  : `Pay $${total.toLocaleString()}`}
              </button>
              <p className="text-[11px] text-muted-foreground text-center">
                Tip: use any card ending in 0000 to simulate a declined payment
              </p>
            </div>
          </form>

          {/* ── Order Summary ──────────────────────────── */}
          <aside className="bg-card border border-border rounded-2xl p-6 h-fit lg:sticky lg:top-20">
            <h3 className="font-display text-lg font-bold mb-4">{selectedHotel.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">{selectedRoom.name} · {nights} nights</p>
            <div className="space-y-2 text-sm border-t border-border pt-4">
              <Line label="Subtotal"    value={`$${subtotal.toLocaleString()}`} />
              <Line label="Service Fee" value={`$${serviceFee}`} />
              <Line label="Taxes (GST)" value={`$${taxes}`} />
              {discount > 0 && <Line label="Discount" value={`-$${discount}`} accent />}
            </div>
            <div className="flex justify-between items-end pt-4 mt-4 border-t border-border">
              <span className="font-semibold">Total</span>
              <span className="font-display text-2xl font-bold text-primary">${total.toLocaleString()}</span>
            </div>
            <div className="mt-5 pt-5 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Saved to Database on Payment
              </p>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" /> Guest profile (name, email, phone)</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  {guest.adults?.length ? `${guest.adults.length} additional adult(s)` : "Lead guest only"}
                </li>
                {guest.children?.length ? <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" /> {guest.children.length} child(ren)</li> : null}
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" /> Booking dates & pricing</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" /> Room marked as Booked</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
      <style>{`.input{width:100%;padding:.6rem 1rem;border:1px solid hsl(var(--border));border-radius:.5rem;outline:none;font-size:.875rem;background:transparent;color:hsl(var(--primary))}.input:focus{border-color:hsl(var(--primary));box-shadow:0 0 0 2px hsl(var(--primary)/0.1)}`}</style>
    </Layout>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
    <div className="mt-1.5">{children}</div>
  </label>
);

const MethodBtn = ({ active, onClick, icon, label }: any) => (
  <button type="button" onClick={onClick}
    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-base ${active ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground hover:text-primary"}`}>
    <span className="w-5 h-5">{icon}</span>
    <span className="text-sm font-semibold">{label}</span>
  </button>
);

const Line = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div className="flex justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className={accent ? "text-accent font-semibold" : "text-primary font-medium"}>{value}</span>
  </div>
);

export default Payment;
