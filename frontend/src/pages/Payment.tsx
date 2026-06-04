import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CreditCard, Smartphone, Building2, Lock,
  AlertCircle, Loader2, ShieldCheck, Info,
} from "lucide-react";
import Layout from "@/components/Layout";
import Stepper from "@/components/Stepper";
import PasswordInput from "@/components/PasswordInput";
import { useBooking, calcNights, Booking } from "@/context/BookingContext";
import { createBooking, createPaymentOrder, verifyPaymentSignature } from "@/services/api";

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

  // Field-specific validation errors for real-time reporting
  const [govtIdError, setGovtIdError] = useState("");
  const [upiError, setUpiError] = useState("");

  const validateGovtId = (val: string, type: string) => {
    if (!val.trim()) {
      return "Government ID number is required for check-in verification.";
    }
    if (type === "aadhaar") {
      const cleanId = val.replace(/\s/g, "");
      if (!/^\d{12}$/.test(cleanId)) {
        return "Aadhaar Card number must be exactly 12 digits";
      }
    }
    if (type === "pan") {
      const cleanId = val.replace(/\s/g, "").toUpperCase();
      if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(cleanId)) {
        return "PAN Card must be exactly 10 characters (e.g. ABCDE1234F)";
      }
    }
    if (type === "passport") {
      const cleanId = val.replace(/\s/g, "").toUpperCase();
      if (!/^[A-Z0-9]{8}$/.test(cleanId)) {
        return "Passport must be exactly 8 characters";
      }
    }
    return "";
  };

  const validateUpi = (val: string) => {
    const cleanUpi = val.trim();
    if (!cleanUpi) {
      return "UPI ID is required";
    }
    if (!/^[\w.\-_]{2,256}@[a-zA-Z0-9.\-_]{2,64}$/.test(cleanUpi)) {
      return "Invalid UPI ID format. Example: name@bank";
    }
    return "";
  };

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
    
    const idErr = validateGovtId(govtId, idType);
    if (idErr) {
      setGovtIdError(idErr);
      return idErr;
    } else {
      setGovtIdError("");
    }

    if (method === "card") {
      if (!/^\d{12,19}$/.test(card.number.replace(/\s/g, ""))) return "Invalid card number";
      if (!card.name.trim()) return "Cardholder name required";
      if (!/^\d{2}\/\d{2}$/.test(card.expiry)) return "Expiry must be MM/YY";
      if (!/^\d{3,4}$/.test(card.cvv)) return "Invalid CVV";
    }

    if (method === "upi") {
      const upiErr = validateUpi(upi);
      if (upiErr) {
        setUpiError(upiErr);
        return upiErr;
      } else {
        setUpiError("");
      }
    }

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
      if (search.guests > (selectedRoom.capacity || 999)) {
        setError(`This room only accommodates up to ${selectedRoom.capacity || 1} guests.`);
        setProcessing(false);
        return;
      }

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
          hotelId:        selectedHotel.id,
          guestCount:     search.guests,
          guest:          { name: guest.name, email: user?.email || guest.email, phone: guest.phone, city: "", id: govtId },
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
          additionalChildren: guest.children?.map((c) => ({ name: c.name, age: Number(c.age), id: c.id })) || [],
          hotelName:      selectedHotel.name,
        });
        mongoBookingId = response.data._id;
      } catch (bookingErr: any) {
        const msg = bookingErr.response?.data?.message || bookingErr?.message || "";
        if (msg.toLowerCase().includes("room") || msg.toLowerCase().includes("unavailable") || msg.toLowerCase().includes("booked")) {
          setError(msg || "This room is no longer available. Please select a different room.");
          setProcessing(false);
          return;
        }
        setError(msg || "Unable to create booking reservation. Please try again.");
        setProcessing(false);
        return;
      }

      if (!mongoBookingId) {
        setError("Invalid booking reference. Please try again.");
        setProcessing(false);
        return;
      }

      // Load Razorpay SDK Script
      const isLoaded = await new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });

      if (!isLoaded) {
        setError("Failed to load payment gateway script. Please check your network connection.");
        setProcessing(false);
        return;
      }

      // Create Razorpay Order on the backend
      let rzpOrder;
      try {
        const rzpRes = await createPaymentOrder(mongoBookingId);
        if (!rzpRes.success || !rzpRes.orderId) {
          throw new Error(rzpRes.message || "Failed to create payment order.");
        }
        rzpOrder = rzpRes;
      } catch (orderErr: any) {
        setError(orderErr.message || "Unable to initialize payment gateway order.");
        setProcessing(false);
        return;
      }

      // Open Razorpay Checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_dummy",
        amount: rzpOrder.amount, // in paise
        currency: rzpOrder.currency,
        name: "LuxeStay",
        description: `Booking payment for ${selectedHotel.name}`,
        order_id: rzpOrder.orderId,
        prefill: {
          name: guest.name,
          email: user?.email || guest.email,
          contact: guest.phone,
        },
        theme: {
          color: "#0F172A",
        },
        handler: async function (response: any) {
          setProcessing(true);
          try {
            const verifyRes = await verifyPaymentSignature({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyRes.success) {
              const booking: Booking = {
                id: mongoBookingId!,
                hotel: selectedHotel,
                room: selectedRoom,
                search,
                guest: { ...guest, email: user?.email || guest.email },
                nights,
                subtotal,
                taxes: taxes + serviceFee,
                discount,
                total,
                status: "Confirmed",
                createdAt: new Date().toISOString(),
              };

              addBooking(booking);
              nav("/confirmation");
            } else {
              setError("Payment signature verification failed.");
            }
          } catch (verifyErr: any) {
            setError(verifyErr.message || "Signature verification failed. Please contact support.");
          } finally {
            setProcessing(false);
          }
        },
        modal: {
          ondismiss: function () {
            setProcessing(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setError(err.message || "Payment failed. Please try again.");
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
                    <select value={idType}
                      onChange={(e) => {
                        const newType = e.target.value;
                        setIdType(newType);
                        if (govtId) {
                          setGovtIdError(validateGovtId(govtId, newType));
                        } else {
                          setGovtIdError("");
                        }
                      }}
                      className="input">
                      {ID_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label={(ID_TYPES.find(t => t.value === idType)?.label ?? "ID") + " Number"}>
                    <input type="text" value={govtId}
                      onChange={(e) => {
                        setGovtId(e.target.value);
                        setGovtIdError(validateGovtId(e.target.value, idType));
                      }}
                      onBlur={(e) => {
                        setGovtIdError(validateGovtId(e.target.value, idType));
                      }}
                      placeholder={
                        idType === "aadhaar"  ? "XXXX XXXX XXXX" :
                        idType === "pan"      ? "ABCDE1234F" :
                        idType === "passport" ? "A1234567" : "Enter ID number"
                      }
                      className={`input ${govtIdError ? "border-destructive focus:border-destructive focus:ring-destructive/10" : ""}`}
                      autoComplete="off" />
                    {govtIdError && (
                      <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{govtIdError}</span>
                      </p>
                    )}
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
                      <PasswordInput value={card.cvv} onChange={(e) => setCard({ ...card, cvv: (e.target as HTMLInputElement).value })} placeholder="123" className="input" />
                    </Field>
                  </div>
                </>
              )}
              {method === "upi" && (
                <Field label="UPI ID">
                  <input value={upi}
                    onChange={(e) => {
                      setUpi(e.target.value);
                      setUpiError(validateUpi(e.target.value));
                    }}
                    onBlur={(e) => {
                      setUpiError(validateUpi(e.target.value));
                    }}
                    placeholder="yourname@bank"
                    className={`input ${upiError ? "border-destructive focus:border-destructive focus:ring-destructive/10" : ""}`} />
                  {upiError && (
                    <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{upiError}</span>
                    </p>
                  )}
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
