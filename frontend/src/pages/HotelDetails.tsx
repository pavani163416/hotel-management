import { useNavigate, useParams } from "react-router-dom";
import { MapPin, Star, Wifi, Coffee, Wind, Users, BedDouble, Check, LogIn, Waves, Trees, Dumbbell, Utensils, Car, ShieldCheck, Sunset, Snowflake, Bath, Tv, PocketKnife, Sailboat, Baby, PawPrint, Phone, AlertCircle, Loader2, Navigation, ExternalLink, Sparkles, Heart, Flame, ChevronLeft, ChevronRight } from "lucide-react";
import Layout from "@/components/Layout";
import { useBooking } from "@/context/BookingContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useState, useEffect, useMemo } from "react";
import DOMPurify from "dompurify";
import { AuthModal } from "@/components/AuthModal";
import { API } from "@/services/api";
import { useSEO } from "@/hooks/useSEO";
import { toast } from "sonner";

// Map amenity name → lucide icon
const amenityIcon = (n: string) => {
  if (!n) return null;
  n = n.toLowerCase();
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

type Hall = {
  _id: string;
  name: string;
  description?: string;
  capacity: number;
  pricePerHour?: number;
  pricePerDay?: number;
  amenities?: string[];
  images?: string[];
  isActive?: boolean;
};

type HallBookingForm = {
  eventName: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  notes: string;
};

const HotelDetails = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const { hotels, user, search, setSelectedHotel, setSelectedRoom, submitReview } = useBooking();
  const { format } = useCurrency();
  const hotel = hotels.find((h) => h.id === id);

  useSEO({
    title: hotel ? `${hotel.name} - Luxury Hotel Stays` : "Hotel Details",
    description: hotel ? `Book your stay at ${hotel.name} in ${hotel.location}. ${hotel.description.slice(0, 150)}` : "View details of this premium luxury property.",
    canonical: hotel ? `https://hotel-mgnt.vercel.app/hotel/${hotel.id}` : undefined,
  });

  const [tab, setTab] = useState<"rooms" | "amenities" | "reviews" | "location">("rooms");
  const [reviewText, setReviewText] = useState("");
  const [reviewName, setReviewName] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [err, setErr] = useState("");

  // Captcha removed for reviews — simpler UX; server-side no longer requires captcha for reviews

  // Room filters
  const [roomSort, setRoomSort] = useState<"price-asc" | "price-desc" | "default">("default");
  const [capacityFilter, setCapacityFilter] = useState(1);
  const [bedFilter, setBedFilter] = useState("any");
  const [breakfastFilter, setBreakfastFilter] = useState(false);
  const [cancellationFilter, setCancellationFilter] = useState(false);
  const [availableOnlyFilter, setAvailableOnlyFilter] = useState(false);

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
      const room = hotel.rooms?.find((r) => r.id === pendingRoomId);
      if (room && room.available > 0) {
        setPendingRoomId(null);
        setSelectedHotel(hotel);
        setSelectedRoom(room);
        nav("/booking");
      }
    }
  }, [user, pendingRoomId, hotel, setSelectedHotel, setSelectedRoom, nav]);

  useEffect(() => {
    if (user) {
      setReviewName(user.name);
    } else {
      setReviewName("");
    }
  }, [user]);

  useEffect(() => {
    if (!hotel || !search.checkIn || !search.checkOut) return;
    (hotel.rooms || []).forEach(async (r) => {
      try {
        const params = new URLSearchParams({
          hotelStringId: hotel.id,
          roomTypeId: r.roomTypeId || r.id,
          checkIn: search.checkIn,
          checkOut: search.checkOut,
        });
        const res = await fetch(`${API}/rooms/available-count?${params}`);
        const json = await res.json();
        if (json.success && typeof json.available === "number") {
          setAvailCount(prev => ({ ...prev, [r.id]: json.available }));
        }
      } catch { /* silent */ }
    });
  }, [hotel?.id, search.checkIn, search.checkOut]);


  if (!hotel) return <Layout><div className="container py-20 text-center">Hotel not found</div></Layout>;

  const allReviews = Array.isArray(hotel.reviews) ? hotel.reviews : [];

  const select = async (roomId: string) => {
    const room = (hotel.rooms || []).find((r) => r.id === roomId);
    if (!room || room.available === 0) return;

    if (!user) {
      // Not signed in → show auth popup, remember the room
      setPendingRoomId(roomId);
      setAuthMode("signin");
      setAuthOpen(true);
      return;
    }

    setRoomStatus((prev) => ({ ...prev, [roomId]: { checking: true, error: "" } }));
    try {
      const res = await fetch(`${API}/rooms/availability`, {
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
    if (reviewText.trim().length < 5) {
      setErr("Review must be at least 5 characters long.");
      return;
    }
    if (reviewRating < 1 || reviewRating > 5) {
      setErr("Please select a star rating.");
      return;
    }
    try {
      setErr("");
      await submitReview(hotel!.id, {
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

  if (!hotel) {
    return (
      <Layout>
        <div className="container py-20 text-center min-h-[60vh] flex flex-col items-center justify-center">
          <h1 className="text-3xl font-display font-bold text-primary mb-4">Hotel Not Found</h1>
          <p className="text-muted-foreground mb-8">We couldn't find the property you're looking for.</p>
          <button onClick={() => nav("/hotels")} className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-base">
            Browse All Hotels
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Gallery */}
      <div className="container pt-8 px-0 sm:px-4">
        {/* Desktop Gallery */}
        <div className="hidden md:grid grid-cols-3 gap-3 rounded-2xl overflow-hidden h-[420px] max-h-[50vh]">
          <div className="col-span-2 overflow-hidden rounded-2xl bg-surface-2">
            <img src={hotel.gallery?.[0] || hotel.image} alt={hotel.name}
              className="block w-full h-full object-cover" />
          </div>
          <div className="grid grid-rows-2 gap-3 h-full min-h-0">
            <div className="overflow-hidden rounded-2xl h-full min-h-0 bg-surface-2">
              <img src={hotel.gallery?.[1] || hotel.image} alt="" className="block w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="overflow-hidden rounded-2xl h-full min-h-0 bg-surface-2">
              <img src={hotel.gallery?.[2] || hotel.image} alt="" className="block w-full h-full object-cover" loading="lazy" />
            </div>
          </div>
        </div>

        {/* Mobile Swipe Gallery */}
        <div className="md:hidden flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-2 px-4 pb-2">
          {[hotel.gallery?.[0] || hotel.image, hotel.gallery?.[1] || hotel.image, hotel.gallery?.[2] || hotel.image].map((src, i) => (
             <img key={i} src={src} alt="" className="snap-center shrink-0 w-[85vw] h-[280px] object-cover rounded-xl" loading={i === 0 ? "eager" : "lazy"} />
          ))}
        </div>
      </div>

      <div className="container py-8 pb-28 md:pb-8">
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
        <div id="rooms-section" className="flex gap-1 border-b border-border mt-8 overflow-x-auto scrollbar-hide whitespace-nowrap">
          {["rooms", "amenities", "reviews", "location"].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-semibold capitalize relative transition-base min-h-[44px] ${tab === t ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
              {t} {t === "reviews" && `(${allReviews.length})`}
              {tab === t && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-accent rounded-full" />}
            </button>
          ))}
        </div>

        {tab === "rooms" && (
          <div className="mt-8">
            {/* Room Filters */}
            <div className="flex items-center gap-3 flex-wrap mb-5">
              <h2 className="font-display text-2xl font-bold flex-1">Select Your Room</h2>
              <div className="flex items-center gap-3 flex-wrap bg-secondary/30 p-2.5 rounded-2xl border border-border overflow-x-auto max-w-full">
                <div className="relative">
                  <select value={capacityFilter} onChange={(e) => setCapacityFilter(Number(e.target.value))}
                    className="appearance-none border border-border rounded-xl pl-9 pr-8 py-2 text-sm font-medium bg-card outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-base cursor-pointer shadow-sm min-w-[130px]">
                    <option value={1}>Any Capacity</option>
                    <option value={2}>2+ Guests</option>
                    <option value={3}>3+ Guests</option>
                    <option value={4}>4+ Guests</option>
                  </select>
                  <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
                <div className="relative">
                  <select value={bedFilter} onChange={(e) => setBedFilter(e.target.value)}
                    className="appearance-none border border-border rounded-xl pl-9 pr-8 py-2 text-sm font-medium bg-card outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-base cursor-pointer shadow-sm min-w-[120px]">
                    <option value="any">Any Bed</option>
                    <option value="king">King Bed</option>
                    <option value="queen">Queen Bed</option>
                    <option value="twin">Twin Beds</option>
                  </select>
                  <BedDouble className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
                <div className="relative">
                  <select value={roomSort} onChange={(e) => setRoomSort(e.target.value as any)}
                    className="appearance-none border border-border rounded-xl px-4 pr-8 py-2 text-sm font-medium bg-card outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-base cursor-pointer shadow-sm">
                    <option value="default">Default Order</option>
                    <option value="price-asc">Price: Low → High</option>
                    <option value="price-desc">Price: High → Low</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2 lg:ml-auto">
                  <label className={`flex items-center gap-1.5 text-sm cursor-pointer select-none px-3.5 py-2 rounded-xl border transition-base font-medium shadow-sm ${breakfastFilter ? "border-green-500 bg-green-50/50 text-green-700" : "border-border bg-card text-muted-foreground hover:bg-secondary"}`}>
                    <input type="checkbox" checked={breakfastFilter} onChange={(e) => setBreakfastFilter(e.target.checked)} className="sr-only" />
                    <Coffee className="w-3.5 h-3.5" /> Breakfast
                  </label>
                  <label className={`flex items-center gap-1.5 text-sm cursor-pointer select-none px-3.5 py-2 rounded-xl border transition-base font-medium shadow-sm ${cancellationFilter ? "border-blue-500 bg-blue-50/50 text-blue-700" : "border-border bg-card text-muted-foreground hover:bg-secondary"}`}>
                    <input type="checkbox" checked={cancellationFilter} onChange={(e) => setCancellationFilter(e.target.checked)} className="sr-only" />
                    <Check className="w-3.5 h-3.5" /> Free Cancel
                  </label>
                  <label className={`flex items-center gap-1.5 text-sm cursor-pointer select-none px-3.5 py-2 rounded-xl border transition-base font-medium shadow-sm ${availableOnlyFilter ? "border-accent bg-accent/10 text-accent" : "border-border bg-card text-muted-foreground hover:bg-secondary"}`}>
                    <input type="checkbox" checked={availableOnlyFilter} onChange={(e) => setAvailableOnlyFilter(e.target.checked)} className="sr-only" />
                    <Sparkles className="w-3.5 h-3.5" /> Available only
                  </label>
                </div>
              </div>
            </div>
            {(hotel.rooms || []).length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
                No rooms are currently available for this hotel. Please check back later or select another property.
              </div>
            ) : (() => {
              const displayRooms = (hotel.rooms || [])
                .filter((r) => r.capacity >= capacityFilter)
                .filter((r) => bedFilter === "any" || (r.bed && r.bed.toLowerCase().includes(bedFilter.toLowerCase())))
                .filter((r) => !breakfastFilter || r.breakfastIncluded || (Array.isArray(r.features) && r.features.some((f) => f && f.toLowerCase().includes("breakfast"))))
                .filter((r) => !cancellationFilter || r.freeCancellation)
                .filter((r) => {
                  if (!availableOnlyFilter) return true;
                  const live = availCount[r.id];
                  return live != null ? live > 0 : r.available > 0;
                })
                .sort((a, b) => roomSort === "price-asc" ? a.price - b.price : roomSort === "price-desc" ? b.price - a.price : 0);
              return (
                <>
                  {displayRooms.length === 0 && (
                    <p className="text-muted-foreground text-sm mb-4">No rooms match the selected filters.</p>
                  )}
                <div className="border border-border rounded-2xl overflow-hidden bg-card">
                  <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_auto] bg-primary text-primary-foreground text-xs uppercase tracking-wider font-semibold">
                    <div className="p-4">Room Type</div><div className="p-4">Key Features</div><div className="p-4 text-right">Daily Price</div><div className="p-4">Action</div>
                  </div>
                  {displayRooms.map((r) => {
                    const roomsLeft: number | null =
                      availCount[r.id] != null
                        ? (availCount[r.id] as number)
                        : r.available >= 0
                        ? r.available
                        : null;
                    const isSoldOut = roomsLeft === 0;

                    return (
                    <div key={r.id} className={`grid md:grid-cols-[2fr_2fr_1fr_auto] gap-4 p-5 border-t border-border first:border-t-0 items-center ${isSoldOut ? "opacity-70" : ""}`}>
                      <div>
                        <h4 className="font-semibold text-primary">{r.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                          <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" /> {r.bed}</span>
                          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {r.capacity}</span>
                        </p>
                        {/* Availability badge */}
                        {isSoldOut ? (
                          <p className="text-xs font-semibold text-destructive mt-1.5">
                            Sold out
                          </p>
                        ) : roomsLeft === 1 ? (
                          <p className="text-xs font-semibold text-amber-600 mt-1.5">
                            Only 1 Room Left
                          </p>
                        ) : roomsLeft === 2 ? (
                          <p className="text-xs font-semibold text-amber-600 mt-1.5">
                            Only 2 Rooms Left
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(Array.isArray(r.features) ? r.features : []).map((f) => (
                          <span key={f} className="text-xs px-2 py-1 rounded bg-secondary text-primary font-medium flex items-center gap-1">
                            {amenityIcon(f)}
                            {f}
                          </span>
                        ))}
                        {r.breakfastIncluded && (
                          <span className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 font-medium border border-green-200">🍳 Breakfast</span>
                        )}
                        {r.freeCancellation && (
                          <span className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 font-medium border border-blue-200">✓ Free Cancel</span>
                        )}
                      </div>
                      <div className="md:text-right">
                        <p className="font-display text-xl font-bold text-primary">{format(r.price)}</p>
                        <p className="text-xs text-muted-foreground">per night</p>
                      </div>
                      <div className="flex flex-col items-stretch gap-1 md:min-w-[140px]">
                        {isSoldOut ? (
                          <button
                            disabled
                            className="bg-secondary text-muted-foreground px-4 py-2.5 rounded-lg font-semibold text-sm border border-border cursor-not-allowed"
                          >
                            Sold Out
                          </button>
                        ) : (
                          <button
                            onClick={() => select(r.id)}
                            disabled={roomStatus[r.id]?.checking}
                            className="bg-accent hover:bg-accent/90 disabled:opacity-60 disabled:cursor-not-allowed text-accent-foreground px-4 py-2.5 rounded-lg font-semibold text-sm transition-base flex items-center justify-center gap-1.5">
                            {roomStatus[r.id]?.checking ? (
                              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking...</>
                            ) : (
                              <>{!user && <LogIn className="w-3.5 h-3.5" />}Select Room</>
                            )}
                          </button>
                        )}
                        {/* Date-based availability error */}
                        {roomStatus[r.id]?.error && (
                          <div className="flex items-start gap-1.5 mt-1 p-2 bg-destructive/10 border border-destructive/20 rounded-lg">
                            <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                            <p className="text-[11px] text-destructive leading-tight">{roomStatus[r.id].error}</p>
                          </div>
                        )}
                        {/* Sign-in hint for available rooms */}
                        {!isSoldOut && !user && (
                          <span className="text-[11px] text-muted-foreground text-center">Sign in to book</span>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
                <div className="mt-10 p-6 bg-secondary/50 rounded-2xl">
                  <h3 className="font-display text-xl font-bold mb-2">About this property</h3>
                  <p className="text-muted-foreground leading-relaxed">{hotel.description}</p>
                </div>
              </>
              );
            })()}
          </div>
        )}
        {tab === "amenities" && (
          <div className="mt-8 grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {(Array.isArray(hotel.amenities) ? hotel.amenities : []).map((a) => (
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
            {user ? (
              <form onSubmit={handleSubmitReview} className="bg-card border border-border rounded-2xl p-6 h-fit space-y-4">
                <h3 className="font-display text-lg font-bold">Write a Review</h3>
                <input value={reviewName} onChange={(e) => setReviewName(e.target.value)} placeholder="Your name"
                  className="w-full px-4 py-2.5 border border-border rounded-lg outline-none focus:border-accent text-sm" />
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button type="button" key={n} onClick={() => setReviewRating(n)} className="focus:outline-none min-w-[44px] min-h-[44px] flex items-center justify-center">
                      <Star className={`w-6 h-6 transition-base ${n <= reviewRating ? "fill-accent text-accent" : "text-muted-foreground/30 fill-none"}`} />
                    </button>
                  ))}
                </div>
                <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Share your experience..." rows={4}
                  className="w-full px-4 py-2.5 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm resize-none" />
                
                {/* Captcha removed for reviews */}

                {err && <p className="text-destructive text-xs">{err}</p>}
                <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded-lg font-semibold text-sm transition-base">
                  Submit Review
                </button>
              </form>
            ) : (
              <div className="bg-card border border-border rounded-2xl p-6 h-fit text-center space-y-4">
                <h3 className="font-display text-lg font-bold">Write a Review</h3>
                <p className="text-muted-foreground text-sm">You must be signed in to submit a review for this property.</p>
                <button
                  type="button"
                  onClick={() => { setAuthMode("signin"); setAuthOpen(true); }}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded-lg font-semibold text-sm transition-base"
                >
                  Sign In / Sign Up
                </button>
              </div>
            )}
          </div>
        )}

        {tab === "location" && (
          <div className="mt-8 space-y-6">
            {/* Map embed */}
            {hotel.mapUrl ? (
              <a
                href={hotel.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-2xl overflow-hidden border border-border h-80 relative group cursor-pointer"
              >
                <iframe
                  title="Hotel Location"
                  width="100%"
                  height="100%"
                  style={{ border: 0, pointerEvents: "none" }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={hotel.mapUrl.includes("embed") ? hotel.mapUrl : `https://maps.google.com/maps?q=${encodeURIComponent(hotel.mapUrl)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200 flex items-center justify-center">
                  <span className="bg-background/90 text-primary px-4 py-2 rounded-xl text-xs font-semibold shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1.5 border border-border">
                    <ExternalLink className="w-3.5 h-3.5" /> View on Google Maps
                  </span>
                </div>
              </a>
            ) : hotel.coords && hotel.coords[0] !== 0 && hotel.coords[1] !== 0 ? (
              <a
                href={`https://www.google.com/maps?q=${hotel.coords[0]},${hotel.coords[1]}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-2xl overflow-hidden border border-border h-80 relative group cursor-pointer"
              >
                <iframe
                  title="Hotel Location"
                  width="100%"
                  height="100%"
                  style={{ border: 0, pointerEvents: "none" }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://maps.google.com/maps?q=${hotel.coords[0]},${hotel.coords[1]}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200 flex items-center justify-center">
                  <span className="bg-background/90 text-primary px-4 py-2 rounded-xl text-xs font-semibold shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1.5 border border-border">
                    <ExternalLink className="w-3.5 h-3.5" /> View on Google Maps
                  </span>
                </div>
              </a>
            ) : (
              <div className="rounded-2xl border border-border bg-secondary/40 h-48 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MapPin className="w-8 h-8 mx-auto mb-2 text-accent" />
                  <p className="text-sm font-medium">{hotel.location}</p>
                  <p className="text-xs mt-1">Exact coordinates not available</p>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              {hotel.mapUrl ? (
                <a
                  href={hotel.mapUrl}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-base"
                >
                  <ExternalLink className="w-4 h-4" /> Open in Google Maps
                </a>
              ) : hotel.coords && hotel.coords[0] !== 0 && (
                <>
                  <a
                    href={`https://www.google.com/maps?q=${hotel.coords[0]},${hotel.coords[1]}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-base"
                  >
                    <ExternalLink className="w-4 h-4" /> Open in Google Maps
                  </a>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${hotel.coords[0]},${hotel.coords[1]}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl font-semibold text-sm hover:bg-secondary transition-base"
                  >
                    <Navigation className="w-4 h-4" /> Get Directions
                  </a>
                </>
              )}
              {(!hotel.coords || hotel.coords[0] === 0) && (
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent(hotel.name + " " + hotel.location)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-base"
                >
                  <ExternalLink className="w-4 h-4" /> Search on Google Maps
                </a>
              )}
            </div>

            {/* Location info */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-5 border border-border rounded-2xl bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-accent" />
                  <span className="font-semibold text-sm">Address</span>
                </div>
                <p className="text-muted-foreground text-sm">{hotel.location}</p>
                {hotel.coords && hotel.coords[0] !== 0 && (
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    {hotel.coords[0].toFixed(4)}, {hotel.coords[1].toFixed(4)}
                  </p>
                )}
              </div>
              <NearbyPlaces coords={hotel.coords} hotelName={hotel.name} />
            </div>
          </div>
        )}
      </div>

      {/* Sticky Mobile Book CTA */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur border-t border-border z-40 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <button
          onClick={() => {
            setTab("rooms");
            setTimeout(() => {
              document.getElementById("rooms-section")?.scrollIntoView({ behavior: "smooth" });
            }, 100);
          }}
          className="w-full min-h-[44px] bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl font-bold text-lg shadow-luxe transition-base"
        >
          Book Now
        </button>
      </div>

      {/* Auth popup */}
      <AuthModal
        isOpen={authOpen}
        onClose={() => {
          setAuthOpen(false);
          if (!user) setPendingRoomId(null);
        }}
        defaultMode={authMode}
      />
    </Layout>
  );
};

export default HotelDetails;

// ── NearbyPlaces: uses OpenStreetMap Overpass API (free, no key needed) ──
const AMENITY_ICONS: Record<string, string> = {
  airport: "✈",
  museum: "🏛",
  restaurant: "🍽",
  hospital: "🏥",
  park: "🌿",
  train_station: "🚉",
  bus_station: "🚌",
  pharmacy: "💊",
  bank: "🏦",
  attraction: "⭐",
  mall: "🛍",
};

interface NearbyPlace {
  name: string;
  type: string;
  dist: number;
}

const NearbyPlaces = ({ coords, hotelName }: { coords?: [number, number]; hotelName: string }) => {
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchNearby = async () => {
    if (!coords || coords[0] === 0) return;
    setLoading(true);
    try {
      const [lat, lon] = coords;
      const radius = 5000; // 5km for better coverage
      const query = `[out:json][timeout:15];(node["aeroway"="aerodrome"](around:50000,${lat},${lon});node["tourism"~"attraction|museum|theme_park"](around:${radius},${lat},${lon});node["amenity"~"restaurant|hospital|pharmacy|bank|cafe"](around:${radius},${lat},${lon});node["railway"~"station|halt"](around:${radius},${lat},${lon});node["public_transport"="stop_position"](around:${radius},${lat},${lon});node["leisure"~"park|beach_resort|water_park"](around:${radius},${lat},${lon});node["shop"~"mall|supermarket"](around:${radius},${lat},${lon}););out body 25;`;
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: query,
        signal: AbortSignal.timeout(12000),
      });
      const data = await res.json();
      const items: NearbyPlace[] = (data.elements || [])
        .filter((e: any) => e.tags?.name && e.lat && e.lon)
        .map((e: any) => {
          const dLat = e.lat - lat;
          const dLon = e.lon - lon;
          const dist = Math.round(Math.sqrt(dLat * dLat + dLon * dLon) * 111000);
          const type =
            e.tags.aeroway === "aerodrome" ? "airport" :
            e.tags.tourism ? "attraction" :
            e.tags.railway || e.tags.public_transport ? "train_station" :
            e.tags.leisure === "park" || e.tags.leisure === "beach_resort" ? "park" :
            e.tags.amenity || "place";
          return { name: e.tags.name, type, dist };
        })
        .sort((a: NearbyPlace, b: NearbyPlace) => a.dist - b.dist)
        .slice(0, 8);
      setPlaces(items);
    } catch { /* silent — Overpass may timeout for remote locations */ }
    finally { setLoading(false); setFetched(true); }
  };

  useEffect(() => {
    if (coords && coords[0] !== 0) fetchNearby();
  }, [coords?.join(",")]);

  if (!coords || coords[0] === 0) {
    return (
      <div className="p-5 border border-border rounded-2xl bg-card">
        <div className="flex items-center gap-2 mb-2">
          <Navigation className="w-4 h-4 text-accent" />
          <span className="font-semibold text-sm">Nearby Places</span>
        </div>
        <a href={`https://www.google.com/maps/search/attractions+near+${encodeURIComponent(hotelName)}`}
          target="_blank" rel="noopener noreferrer"
          className="text-sm text-primary hover:underline">
          Search nearby on Google Maps →
        </a>
      </div>
    );
  }

  return (
    <div className="p-5 border border-border rounded-2xl bg-card">
      <div className="flex items-center gap-2 mb-3">
        <Navigation className="w-4 h-4 text-accent" />
        <span className="font-semibold text-sm">Nearby Places</span>
      </div>
      {loading && <p className="text-xs text-muted-foreground">Finding nearby places...</p>}
      {fetched && places.length === 0 && !loading && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground mb-2">Explore nearby on Google Maps:</p>
          {[
            { label: "✈ Nearby Airports", q: "airports" },
            { label: "🏛 Attractions", q: "tourist+attractions" },
            { label: "🍽 Restaurants", q: "restaurants" },
            { label: "🚉 Transport", q: "transport+stations" },
          ].map((item) => (
            <a key={item.q}
              href={`https://www.google.com/maps/search/${item.q}/@${coords[0]},${coords[1]},14z`}
              target="_blank" rel="noopener noreferrer"
              className="block text-xs text-primary hover:underline">
              {item.label} →
            </a>
          ))}
        </div>
      )}
      <ul className="space-y-1.5">
        {places.map((p, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span>{AMENITY_ICONS[p.type] || "📍"}</span>
            <span className="text-primary font-medium flex-1 truncate">{p.name}</span>
            <span className="text-xs text-muted-foreground shrink-0">
              {p.dist < 1000 ? `${p.dist}m` : `${(p.dist / 1000).toFixed(1)}km`}
            </span>
          </li>
        ))}
      </ul>
      {places.length > 0 && (
        <a href={`https://www.google.com/maps/search/attractions/@${coords[0]},${coords[1]},15z`}
          target="_blank" rel="noopener noreferrer"
          className="text-xs text-primary hover:underline mt-2 block">
          View more on Google Maps →
        </a>
      )}
    </div>
  );
};
