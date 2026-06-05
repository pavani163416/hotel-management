import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X, MapPin, BookOpen, AlertTriangle, Loader2, Clock, Download } from "lucide-react";
import { downloadBookingReceipt, historyItemToReceipt } from "@/utils/receiptPdf";
import Layout from "@/components/Layout";
import { useBooking, Booking } from "@/context/BookingContext";
import { getBookingsByEmail, getMyBookings, cancelBooking as cancelBookingApi } from "@/services/api";

const CANCEL_REASONS = [
  "Change of plans",
  "Found a better deal",
  "Travel dates changed",
  "Medical / health reasons",
  "Work / business conflict",
  "Booked by mistake",
  "Other",
];

// Normalise a booking from either API shape or local context shape
function normalise(b: any) {
  return {
    id:         b.id || b._id || "",
    hotelName:  b.hotel?.name  || b.hotelName  || "LuxeStay",
    hotelCity:  b.hotel?.city  || b.hotelCity  || "",
    hotelImage: b.hotel?.image || b.hotelId?.image || b.hotelImage || b.room?.images?.[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=60",
    hotelLoc:   b.hotel?.location || "",
    checkIn:    b.search?.checkIn  || (b.checkIn  ? new Date(b.checkIn).toISOString().slice(0, 10)  : ""),
    checkOut:   b.search?.checkOut || (b.checkOut ? new Date(b.checkOut).toISOString().slice(0, 10) : ""),
    nights:     b.nights || "",
    total:      b.total ?? b.totalAmount ?? 0,
    status:     b.status || "Confirmed",
    guestName:  b.guest?.name || b.guestSnapshot?.name || "",
    roomName:   b.room?.name  || b.room?.roomNumber || b.room?.type || "",
    createdAt:  b.createdAt || null,
    raw:        b,
  };
}

const History = () => {
  const nav = useNavigate();
  const location = useLocation();
  const { user, bookings: localBookings, cancelBooking } = useBooking();
  const [filter, setFilter]           = useState<"all" | "Confirmed" | "Cancelled">("all");
  const [modal, setModal]             = useState<any | null>(null);
  const [apiBookings, setApiBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelOther, setCancelOther]   = useState("");
  const [cancelling, setCancelling]     = useState(false);

  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  // Fetch real bookings from API when user is logged in
  // location.key changes on every navigation so this re-fetches whenever the user visits History
  useEffect(() => {
    if (!user?.email) return;
    setLoadingBookings(true);
    
    // Try JWT-based endpoint first (uses guestId from token — always correct)
    const token = localStorage.getItem("luxe_customer_token");
    
    const tryJWTFirst = async () => {
      try {
        const res: any = await getMyBookings();
        if (res?.data && res.data.length > 0) {
          setApiBookings(res.data);
          setLoadingBookings(false);
          return true;
        }
      } catch (e) {
        // Continue to fallback
      }
      return false;
    };
    
    const tryEmailFallback = async () => {
      try {
        const res: any = await getBookingsByEmail(user.email);
        if (res?.data) {
          setApiBookings(res.data);
        }
      } catch (e) {
        console.error("Failed to fetch bookings", e);
      }
      setLoadingBookings(false);
    };
    
    if (token) {
      // Try JWT first, then fallback
      tryJWTFirst().then((success) => {
        if (!success) {
          tryEmailFallback();
        }
      });
    } else {
      // No token, use email-based query
      tryEmailFallback();
    }
  }, [user?.email, location.key]);

  const handleCancelConfirm = async () => {
    if (!cancelTarget || !cancelReason) return;
    setCancelling(true);
    const reason = cancelReason === "Other" ? cancelOther || "Other" : cancelReason;
    try {
      await cancelBookingApi(cancelTarget.id, reason);
      
      // Refresh bookings using JWT-based endpoint if available
      const token = localStorage.getItem("luxe_customer_token");
      if (token) {
        try {
          const res: any = await getMyBookings();
          if (res?.data) setApiBookings(res.data);
        } catch {
          // Fallback to email-based query if JWT fails
          if (user?.email) {
            const res: any = await getBookingsByEmail(user.email);
            if (res?.data) setApiBookings(res.data);
          }
        }
      } else if (user?.email) {
        // No token, use email-based query
        const res: any = await getBookingsByEmail(user.email);
        if (res?.data) setApiBookings(res.data);
      }
    } catch (error) {
      console.error("Cancellation error:", error);
    }
    
    // Also cancel locally
    cancelBooking(cancelTarget.id);
    setCancelTarget(null);
    setCancelReason("");
    setCancelOther("");
    setCancelling(false);
  };

  if (!user) {
    nav("/", { replace: true, state: { openAuth: true } });
    return null;
  }

  // Merge: API bookings are source of truth; local fills gaps
  // Dedup: skip local bookings that already exist in the API response (match by _id or id)
  const merged = [
    ...apiBookings,
    ...localBookings.filter((lb) =>
      !apiBookings.some((ab) => ab._id === lb.id || ab.id === lb.id || ab._id === lb.id?.toString())
    ),
  ];

  // For API bookings: match by email. For local bookings: also match by guest email.
  const userBookings = merged.filter((b: any) => {
    // If this booking came from the backend API, it is already authenticated and verified to belong to the user.
    const isApiBooking = apiBookings.some((ab) => ab._id === b._id || ab.id === b.id || (b._id && ab._id === b._id));
    if (isApiBooking) {
      return true;
    }

    const uEmail = user.email?.toLowerCase() || "";
    // Local booking shape — guest is a GuestDetails object with direct .email
    if (b.hotel && b.room && b.search) {
      const bEmail = b.guest?.email?.toLowerCase() || "";
      // Match if guest email equals user email, or if no guest email (fallback: show it)
      return bEmail === uEmail || !bEmail;
    }
    // API booking shape — match by email
    const bEmail = (b.guest?.email || b.guestSnapshot?.email || "").toLowerCase();
    return uEmail && bEmail === uEmail;
  });

  const list = userBookings
    .filter((b: any) => filter === "all" || b.status === filter)
    .map(normalise);

  const statusClass = (s: string) =>
    s === "Confirmed"         ? "bg-accent/15 text-accent" :
    s === "CONFIRMED"         ? "bg-accent/15 text-accent" :
    s === "Cancelled"         ? "bg-destructive/15 text-destructive" :
    s === "PAYMENT_CANCELLED" ? "bg-orange-500/15 text-orange-600" :
    s === "PENDING_PAYMENT"   ? "bg-yellow-500/15 text-yellow-700" :
    s === "PAYMENT_FAILED"    ? "bg-destructive/15 text-destructive" :
    s === "CheckedIn"         ? "bg-blue-500/15 text-blue-600" :
    s === "CheckedOut"        ? "bg-green-500/15 text-green-600" :
    s === "Completed"         ? "bg-green-500/15 text-green-600" :
    s === "Pending"           ? "bg-yellow-500/15 text-yellow-600" :
    "bg-accent/15 text-accent"; // default to Confirmed style

  const statusLabel = (s: string) =>
    s === "CheckedIn"         ? "Checked In" :
    s === "CheckedOut"        ? "Checked Out" :
    s === "PAYMENT_CANCELLED" ? "Payment Cancelled" :
    s === "PENDING_PAYMENT"   ? "Awaiting Payment" :
    s === "PAYMENT_FAILED"    ? "Payment Failed" :
    s === "CONFIRMED"         ? "Confirmed" :
    s || "Confirmed";

  return (
    <Layout>
      <div className="container py-10">
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Booking History</h1>
        <p className="text-muted-foreground mb-8">Manage your upcoming stays and review past adventures.</p>

        <div className="flex flex-wrap gap-2 mb-6">
          {(["all", "Confirmed", "Cancelled", "PAYMENT_CANCELLED", "Pending"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f as any)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-base ${filter === f ? "bg-accent text-accent-foreground" : "bg-secondary text-primary hover:bg-secondary/70"}`}>
              {f === "all" ? "All Bookings" : statusLabel(f)}
            </button>
          ))}
        </div>

        {loadingBookings ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-20 bg-secondary/40 rounded-2xl">
            <p className="text-primary font-semibold mb-3">No bookings yet</p>
            <button onClick={() => nav("/hotels")}
              className="bg-accent hover:bg-accent/90 text-accent-foreground px-5 py-2.5 rounded-lg text-sm font-semibold transition-base">
              Explore Hotels
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {list.map((b) => (
              <article key={b.id} className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-elegant transition-base">
                <div className="grid md:grid-cols-[180px_1fr_auto] gap-0">
                  <img src={b.hotelImage} alt="" className="w-full h-44 md:h-full object-cover" />
                  <div className="p-5 grid md:grid-cols-3 gap-4 items-center">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Property</p>
                      <p className="font-semibold text-primary">{b.hotelName}</p>
                      {b.hotelCity && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" /> {b.hotelCity}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Dates</p>
                      <p className="text-sm font-medium text-primary">{b.checkIn} → {b.checkOut}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Status</p>
                      <span className={`inline-block px-3 py-1 rounded-lg text-xs font-semibold border ${
                        b.status === "Confirmed"  ? "border-border text-muted-foreground bg-transparent" :
                        b.status === "Cancelled"  ? "bg-destructive/15 text-destructive border-transparent" :
                        b.status === "CheckedIn"  ? "bg-blue-500/15 text-blue-600 border-transparent" :
                        b.status === "CheckedOut" ? "bg-green-500/15 text-green-600 border-transparent" :
                        b.status === "Completed"  ? "bg-green-500/15 text-green-600 border-transparent" :
                        b.status === "Pending"    ? "bg-yellow-500/15 text-yellow-600 border-transparent" :
                        "border-border text-muted-foreground bg-transparent"
                      }`}>{statusLabel(b.status)}</span>
                      {b.createdAt && (
                        <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Booked {new Date(b.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {" at "}
                          {new Date(b.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="p-5 border-t md:border-t-0 md:border-l border-border flex md:flex-col items-end justify-between md:justify-center gap-3 md:min-w-[180px]">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="font-display text-xl font-bold text-primary">${b.total.toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => setModal(b)}
                        className="bg-accent hover:bg-accent/90 text-accent-foreground px-4 py-2 rounded-lg text-sm font-semibold transition-base">
                        View Details
                      </button>
                      {b.status === "Confirmed" && (
                        <button onClick={() => { setCancelTarget(b); setCancelReason(""); setCancelOther(""); }}
                          className="text-destructive text-xs font-semibold hover:underline">
                          Cancel Booking
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {modal && (
        <div className="fixed inset-0 bg-primary/50 backdrop-blur-sm grid place-items-center z-50 p-4 animate-fade-in"
          onClick={() => setModal(null)}>
          <div className="bg-card rounded-2xl max-w-md w-full p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setModal(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-primary">
              <X className="w-5 h-5" />
            </button>
            <img src={modal.hotelImage} alt="" className="w-full h-40 object-cover rounded-xl mb-4" />
            <h3 className="font-display text-2xl font-bold">{modal.hotelName}</h3>
            {modal.hotelLoc && <p className="text-sm text-muted-foreground">{modal.hotelLoc}</p>}
            <div className="mt-4 space-y-2 text-sm">
              <Row label="Booking ID"  value={"#" + modal.id} />
              <Row label="Guest"       value={modal.guestName} />
              <Row label="Room"        value={modal.roomName} />
              <Row label="Dates"       value={modal.checkIn + " → " + modal.checkOut} />
              {modal.nights && <Row label="Nights" value={String(modal.nights)} />}
              <Row label="Total Paid"  value={"$" + modal.total.toLocaleString()} />
              <Row label="Status"      value={statusLabel(modal.status)} />
              {modal.createdAt && (
                <Row label="Confirmed At" value={
                  new Date(modal.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
                  " at " +
                  new Date(modal.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                } />
              )}
              {modal.status === "Cancelled" && (
                <p className="text-xs text-destructive mt-2">
                  Refund of ${modal.total.toLocaleString()} will be processed to your original payment method.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => downloadBookingReceipt(historyItemToReceipt(modal))}
              className="mt-6 w-full border border-border hover:bg-secondary/80 text-primary py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-base">
              <Download className="w-4 h-4" />
              {modal.status === "Cancelled"
                ? "Download Cancellation Receipt (PDF)"
                : "Download Receipt (PDF)"}
            </button>
          </div>
        </div>
      )}

      {/* Cancel Reason Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-primary/50 backdrop-blur-sm grid place-items-center z-50 p-4"
          onClick={() => setCancelTarget(null)}>
          <div className="bg-card rounded-2xl max-w-md w-full p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setCancelTarget(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-primary">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-destructive/10 grid place-items-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-primary">Cancel Booking</h3>
                <p className="text-xs text-muted-foreground">{cancelTarget.hotelName} · #{cancelTarget.id}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Please tell us why you're cancelling. This helps us improve.</p>
            <div className="space-y-2 mb-4">
              {CANCEL_REASONS.map((r) => (
                <label key={r} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-base ${cancelReason === r ? "border-destructive bg-destructive/5" : "border-border hover:bg-secondary/50"}`}>
                  <input type="radio" name="cancelReason" value={r} checked={cancelReason === r}
                    onChange={() => setCancelReason(r)} className="w-4 h-4 accent-destructive" />
                  <span className="text-sm font-medium text-primary">{r}</span>
                </label>
              ))}
            </div>
            {cancelReason === "Other" && (
              <textarea value={cancelOther} onChange={(e) => setCancelOther(e.target.value)}
                placeholder="Please describe your reason..." rows={3}
                className="w-full px-4 py-2.5 border border-border rounded-xl text-sm outline-none focus:border-destructive resize-none mb-4" />
            )}
            <div className="flex gap-3">
              <button onClick={() => setCancelTarget(null)}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-muted-foreground hover:bg-secondary transition-base">
                Keep Booking
              </button>
              <button onClick={handleCancelConfirm}
                disabled={!cancelReason || cancelling || (cancelReason === "Other" && !cancelOther.trim())}
                className="flex-1 py-2.5 bg-destructive text-white rounded-xl text-sm font-semibold hover:bg-destructive/90 disabled:opacity-50 transition-base">
                {cancelling ? "Cancelling..." : "Confirm Cancel"}
              </button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-3">
              Refund of <strong>${cancelTarget.total.toLocaleString()}</strong> will be processed to your original payment method.
            </p>
          </div>
        </div>
      )}
    </Layout>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between border-b border-border pb-2 last:border-0">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-primary">{value}</span>
  </div>
);

export default History;
