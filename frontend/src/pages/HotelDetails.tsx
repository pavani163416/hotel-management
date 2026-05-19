import { useNavigate, useParams } from "react-router-dom";
import { MapPin, Star, Wifi, Coffee, Wind, Users, BedDouble, Check, LogIn, Waves, Trees, Dumbbell, Utensils, Car, ShieldCheck, Flame, Sunset, Snowflake, Bath, Tv, PocketKnife, Sailboat, Baby, PawPrint, Phone, AlertCircle, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import { useBooking } from "@/context/BookingContext";
import { useState, useEffect, type FormEvent } from "react";
import { AuthModal } from "@/components/AuthModal";

// Map amenity name → lucide icon
const amenityIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("wifi") || n.includes("wi-fi") || n.includes("internet")) return <Wifi className="w-4 h-4" />;
  if (n.includes("pool") || n.includes("infinity")) return <Waves className="w-4 h-4" />;
  if (n.includes("garden") || n.includes("park") || n.includes("nature")) return <Trees className="w-4 h-4" />;
  if (n.includes("gym") || n.includes("fitness") || n.includes("sport")) return <Dumbbell className="w-4 h-4" />;
  if (n.includes("restaurant") || n.includes("dining") || n.includes("food")) return <Utensils className="w-4 h-4" />;
  if (n.includes("parking") || n.includes("valet") || n.includes("shuttle") || n.includes("airport")) return <Car className="w-4 h-4" />;
  if (n.includes("spa") || n.includes("wellness") || n.includes("massage")) return <Bath className="w-4 h-4" />;
  if (n.includes("bar") || n.includes("lounge") || n.includes("cocktail")) return <PocketKnife className="w-4 h-4" />;
  if (n.includes("beach") || n.includes("ocean") || n.includes("sea") || n.includes("water sport")) return <Sailboat className="w-4 h-4" />;
  if (n.includes("breakfast") || n.includes("coffee")) return <Coffee className="w-4 h-4" />;
  if (n.includes("ac") || n.includes("air") || n.includes("climate")) return <Wind className="w-4 h-4" />;
  if (n.includes("fireplace") || n.includes("fire")) return <Flame className="w-4 h-4" />;
  if (n.includes("ski") || n.includes("snow") || n.includes("winter")) return <Snowflake className="w-4 h-4" />;
  if (n.includes("sunset") || n.includes("terrace") || n.includes("view") || n.includes("balcony")) return <Sunset className="w-4 h-4" />;
  if (n.includes("tv") || n.includes("smart") || n.includes("entertainment")) return <Tv className="w-4 h-4" />;
  if (n.includes("concierge") || n.includes("butler") || n.includes("service")) return <ShieldCheck className="w-4 h-4" />;
  if (n.includes("family") || n.includes("kids") || n.includes("child")) return <Baby className="w-4 h-4" />;
  if (n.includes("pet")) return <PawPrint className="w-4 h-4" />;
  if (n.includes("phone") || n.includes("business") || n.includes("center")) return <Phone className="w-4 h-4" />;
  return <Check className="w-4 h-4" />;
};

const HotelDetails = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const { hotels, user, search, setSelectedHotel, setSelectedRoom, submitReview } = useBooking();
  const hotel = hotels.find((h) => h.id === id);
  const [tab, setTab] = useState<"rooms" | "amenities" | "reviews">("rooms");
  const [reviewText, setReviewText] = useState("");
  const [reviewName, setReviewName] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [err, setErr] = useState("");

  // Auth popup for unauthenticated booking attempts
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  // Remember which room they tried to select before login
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null);
  // Per-room availability check state: roomId → { checking, error }
  const [roomStatus, setRoomStatus] = useState<Record<string, { checking: boolean; error: string }>>({});
  // Live available-count per room type: roomId → number | null
  const [availCount, setAvailCount] = useState<Record<string, number | null>>({})

  // When user signs in and there's a pending room → proceed to booking
  useEffect(() => {
    if (user && pendingRoomId && hotel) {
      const room = hotel.rooms.find((r) => r.id === pendingRoomId);
      if (room && room.available > 0) {
        setPendingRoomId(null);
        setSelectedHotel(hotel);
        setSelectedRoom(room);
        nav("/booking");
      }
    }
  }, [user, pendingRoomId, hotel, setSelectedHotel, setSelectedRoom, nav]);

  // Fetch live available counts when dates are present
  useEffect(() => {
    if (!hotel || !search.checkIn || !search.checkOut) return;
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    hotel.rooms.forEach(async (r) => {
      try {
        const params = new URLSearchParams({
          hotelStringId: hotel.id,
          roomTypeId: r.id,
          checkIn: search.checkIn,
          checkOut: search.checkOut,
        });
        const res = await fetch(`${base}/rooms/available-count?${params}`);
        const json = await res.json();
        if (json.success && typeof json.available === "number") {
          setAvailCount(prev => ({ ...prev, [r.id]: json.available }));
        }
      } catch { /* silent */ }
    });
  }, [hotel?.id, search.checkIn, search.checkOut]);

  if (!hotel) return <Layout><div className="container py-20 text-center">Hotel not found</div></Layout>;

  const allReviews = hotel.reviews;

  const select = async (roomId: string) => {
    const room = hotel.rooms.find((r) => r.id === roomId);
    if (!room || room.available === 0) return;

    if (!user) {
      // Not signed in → show auth popup, remember the room
      setPendingRoomId(roomId);
      setAuthMode("signin");
      setAuthOpen(true);
      return;
    }

    // Check availability for selected dates before navigating
    setRoomStatus((prev) => ({ ...prev, [roomId]: { checking: true, error: "" } }));
    try {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const res = await fetch(`${base}/rooms/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          checkIn:  search.checkIn,
          checkOut: search.checkOut,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.available) {
        // Room is occupied for these dates — show error in the row
        setRoomStatus((prev) => ({
          ...prev,
          [roomId]: { checking: false, error: json.message || "Room is not available for the selected dates." },
        }));
        return;
      }
    } catch {
      // Network error — proceed anyway (backend will catch it at payment)
    }
    setRoomStatus((prev) => ({ ...prev, [roomId]: { checking: false, error: "" } }));

    // Signed in + available → go straight to booking
    setSelectedHotel(hotel);
    setSelectedRoom(room);
    nav("/booking");
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewText.trim()) {
      setErr("Please fill in your name and review.");
      return;
    }

    try {
      setErr("");
      await submitReview(hotel.id, {
        author: reviewName,
        rating: reviewRating,
        comment: reviewText,
      });
      setReviewName("");
      setReviewText("");
    } catch (error: any) {
      setErr(error.message || "Could not submit review. Please try again.");
    }
  };

  return (
    <Layout>
      {/* Gallery */}
      <div className="container pt-8">
        <div className="grid md:grid-cols-3 gap-3 rounded-2xl overflow-hidden">
          <img src={hotel.gallery[0]} alt={hotel.name} className="md:col-span-2 w-full h-[420px] object-cover" />
          <div className="grid grid-rows-2 gap-3">
            <img src={hotel.gallery[1]} alt="" className="w-full h-full object-cover" loading="lazy" />
            <img src={hotel.gallery[2]} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
        </div>
      </div>

      <div className="container py-8">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-2">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold">{hotel.name}</h1>
            <p className="text-muted-foreground flex items-center gap-1 mt-1.5"><MapPin className="w-4 h-4" /> {hotel.location}</p>
          </div>
          <div className="flex items-center gap-2 bg-secondary px-3 py-2 rounded-lg">
            {typeof hotel.rating === "number" && hotel.reviewCount > 0 ? (
              <>
                <Star className="w-4 h-4 fill-accent text-accent" />
                <span className="font-semibold text-primary">{hotel.rating}</span>
                <span className="text-sm text-muted-foreground">({hotel.reviewCount} reviews)</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">No reviews yet</span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border mt-8">
          {(["rooms", "amenities", "reviews"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-semibold capitalize relative transition-base ${tab === t ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
              {t} {t === "reviews" && `(${allReviews.length})`}
              {tab === t && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-accent rounded-full" />}
            </button>
          ))}
        </div>

        {tab === "rooms" && (
          <div className="mt-8">
            <h2 className="font-display text-2xl font-bold mb-5">Select Your Room</h2>
            {hotel.rooms.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
                No rooms are currently available for this hotel. Please check back later or select another property.
              </div>
            ) : (
              <>
                <div className="border border-border rounded-2xl overflow-hidden bg-card">
                  <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_auto] bg-primary text-primary-foreground text-xs uppercase tracking-wider font-semibold">
                    <div className="p-4">Room Type</div><div className="p-4">Key Features</div><div className="p-4 text-right">Daily Price</div><div className="p-4">Action</div>
                  </div>
                  {hotel.rooms.map((r) => (
                    <div key={r.id} className="grid md:grid-cols-[2fr_2fr_1fr_auto] gap-4 p-5 border-t border-border first:border-t-0 items-center">
                      <div>
                        <h4 className="font-semibold text-primary">{r.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                          <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" /> {r.bed}</span>
                          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {r.capacity}</span>
                        </p>
                        {search.checkIn && search.checkOut && availCount[r.id] != null && (
                          availCount[r.id] === 0 ? (
                            <p className="text-xs font-semibold text-destructive mt-1">Sold out for selected dates</p>
                          ) : (availCount[r.id] ?? 0) <= 3 ? (
                            <p className="text-xs font-semibold text-amber-600 mt-1">
                              Only {availCount[r.id]} room{(availCount[r.id] ?? 0) !== 1 ? "s" : ""} left
                            </p>
                          ) : null
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {r.features.map((f) => (
                          <span key={f} className="text-xs px-2 py-1 rounded bg-secondary text-primary font-medium flex items-center gap-1">
                            {amenityIcon(f)}
                            {f}
                          </span>
                        ))}
                      </div>
                      <div className="md:text-right">
                        <p className="font-display text-xl font-bold text-primary">${r.price}</p>
                        <p className="text-xs text-muted-foreground">per night</p>
                      </div>
                      <div className="flex flex-col items-stretch gap-1 md:min-w-[140px]">
                        <button onClick={() => select(r.id)} disabled={r.available === 0 || availCount[r.id] === 0 || roomStatus[r.id]?.checking}
                          className="bg-accent hover:bg-accent/90 disabled:bg-secondary disabled:text-muted-foreground disabled:cursor-not-allowed text-accent-foreground px-4 py-2.5 rounded-lg font-semibold text-sm transition-base flex items-center justify-center gap-1.5">
                          {roomStatus[r.id]?.checking ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking...</>
                          ) : r.available === 0 || availCount[r.id] === 0 ? "Sold out" : (
                            <>{!user && <LogIn className="w-3.5 h-3.5" />}Select Room</>
                          )}
                        </button>
                        {/* Availability error for this specific room */}
                        {roomStatus[r.id]?.error && (
                          <div className="flex items-start gap-1.5 mt-1 p-2 bg-destructive/10 border border-destructive/20 rounded-lg">
                            <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                            <p className="text-[11px] text-destructive leading-tight">{roomStatus[r.id].error}</p>
                          </div>
                        )}
                        {r.available === 0 ? (
                          <div className="mt-2 rounded-2xl border border-warning/20 bg-warning/10 px-3 py-2 text-sm text-warning">
                            This room type is currently unavailable at this hotel. Please choose another room or check back later.
                          </div>
                        ) : (r.available > 0 && !user && <span className="text-[11px] text-muted-foreground text-center">Sign in to book</span>)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-10 p-6 bg-secondary/50 rounded-2xl">
                  <h3 className="font-display text-xl font-bold mb-2">About this property</h3>
                  <p className="text-muted-foreground leading-relaxed">{hotel.description}</p>
                </div>
              </>
            )}
          </div>
        )}
        {tab === "amenities" && (
          <div className="mt-8 grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {hotel.amenities.map((a) => (
              <div key={a} className="flex items-center gap-3 p-4 border border-border rounded-xl bg-card">
                <span className="grid place-items-center w-9 h-9 rounded-lg bg-accent/10 text-accent">
                  {amenityIcon(a)}
                </span>
                <span className="font-medium text-primary">{a}</span>
              </div>
            ))}
          </div>
        )}

        {tab === "reviews" && (
          <div className="mt-8 grid md:grid-cols-[1fr_360px] gap-8">
            <div className="space-y-4">
              {allReviews.length === 0 && <p className="text-muted-foreground">No reviews yet. Be the first!</p>}
              {allReviews.map((r, i) => (
                <div key={i} className="border border-border rounded-xl p-5 bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-primary">{r.author}</p>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={`w-3.5 h-3.5 ${n <= r.rating ? "fill-accent text-accent" : "text-muted-foreground/30 fill-none"}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm">{r.comment}</p>
                  <p className="text-xs text-muted-foreground mt-2">{r.date}</p>
                </div>
              ))}
            </div>
            <form onSubmit={handleSubmitReview} className="bg-card border border-border rounded-2xl p-6 h-fit space-y-4">
              <h3 className="font-display text-lg font-bold">Write a Review</h3>
              <input value={reviewName} onChange={(e) => setReviewName(e.target.value)} placeholder="Your name"
                className="w-full px-4 py-2.5 border border-border rounded-lg outline-none focus:border-accent text-sm" />
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button type="button" key={n} onClick={() => setReviewRating(n)} className="focus:outline-none">
                    <Star className={`w-6 h-6 transition-base ${n <= reviewRating ? "fill-accent text-accent" : "text-muted-foreground/30 fill-none"}`} />
                  </button>
                ))}
              </div>
              <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Share your experience..." rows={4}
                className="w-full px-4 py-2.5 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm resize-none" />
              {err && <p className="text-destructive text-xs">{err}</p>}
              <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded-lg font-semibold text-sm transition-base">
                Submit Review
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Auth popup — shown when unauthenticated user clicks Select Room */}
      <AuthModal
        isOpen={authOpen}
        onClose={() => {
          setAuthOpen(false);
          // If user cancelled without signing in, clear the pending room
          // so they stay on the hotel page without any redirect
          if (!user) setPendingRoomId(null);
        }}
        defaultMode={authMode}
      />
    </Layout>
  );
};

export default HotelDetails;
