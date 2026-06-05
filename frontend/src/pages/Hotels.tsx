import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Star, MapPin, X, Maximize2, LayoutGrid, List, ChevronLeft, ChevronRight, Flame, Search } from "lucide-react";
import Layout from "@/components/Layout";
import HotelMap from "@/components/HotelMap";
import { useBooking } from "@/context/BookingContext";
import { ALL_AMENITIES } from "@/data/hotels";

const PROPERTY_TYPES = ["Hotel", "Resort", "Villa", "Suite"] as const;

const Hotels = () => {
  const nav = useNavigate();
  const { hotels, search } = useBooking();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("list");
  const [mapOpen, setMapOpen] = useState(false);
  const [maxPrice, setMaxPrice] = useState(Number(searchParams.get("price")) || 5000);
  const [minRating, setMinRating] = useState(Number(searchParams.get("rating")) || 0);
  const [amenities, setAmenities] = useState<string[]>(searchParams.get("amenities")?.split(",").filter(Boolean) || []);
  const [types, setTypes] = useState<string[]>(searchParams.get("type")?.split(",").filter(Boolean) || []);
  const [sort, setSort] = useState<"price-asc" | "price-desc" | "rating">((searchParams.get("sort") as any) || "rating");
  const [paymentToast, setPaymentToast] = useState<"cancelled" | "failed" | null>(null);
  const [nameSearch, setNameSearch] = useState("");
  const [nameFilter, setNameFilter] = useState(""); // only applied on submit
  const [nameDropdown, setNameDropdown] = useState(false);

  // Suggestions: all hotel names that match current input (case-insensitive)
  const nameSuggestions = useMemo(() => {
    const q = nameSearch.trim().toLowerCase();
    if (!q) return [];
    return hotels
      .map((h) => h.name)
      .filter((n) => n.toLowerCase().includes(q))
      .slice(0, 8);
  }, [hotels, nameSearch]);

  const applyNameSearch = (value?: string) => {
    const v = (value ?? nameSearch).trim();
    setNameFilter(v);
    setNameDropdown(false);
  };

  // Show toast if redirected back from a cancelled/failed payment
  useEffect(() => {
    const status = searchParams.get("payment");
    if (status === "cancelled" || status === "failed") {
      setPaymentToast(status);
      // Strip the query param from the URL without re-render
      const clean = new URLSearchParams(searchParams);
      clean.delete("payment");
      setSearchParams(clean, { replace: true });
      const t = setTimeout(() => setPaymentToast(null), 6000);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams();
      if (maxPrice !== 5000) next.set("price", String(maxPrice));
      if (minRating) next.set("rating", String(minRating));
      if (amenities.length) next.set("amenities", amenities.join(","));
      if (types.length) next.set("type", types.join(","));
      if (sort !== "rating") next.set("sort", sort);
      setSearchParams(next, { replace: true });
    }, 300);
    return () => clearTimeout(t);
  }, [maxPrice, minRating, amenities, types, sort, setSearchParams]);

  useEffect(() => { const t = setTimeout(() => setLoading(false), 350); return () => clearTimeout(t); }, []);

  const filtered = useMemo(() => {
    let list = hotels.filter((h) => {
      const ratingValue = typeof h.rating === "number" ? h.rating : 0;
      const loc = h.location || "";
      const cty = h.city || "";
      if (search.location && !loc.toLowerCase().includes(search.location.toLowerCase()) && !cty.toLowerCase().includes(search.location.toLowerCase())) return false;
      if (nameFilter.trim() && !h.name.toLowerCase().includes(nameFilter.trim().toLowerCase())) return false;
      if (h.pricePerNight > maxPrice) return false;
      if (ratingValue < minRating) return false;
      if (amenities.length && !amenities.every((a) => h.amenities.includes(a))) return false;
      if (types.length && (!h.type || !types.includes(h.type))) return false;
      return true;
    });
    if (sort === "price-asc") list = [...list].sort((a, b) => a.pricePerNight - b.pricePerNight);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.pricePerNight - a.pricePerNight);
    if (sort === "rating") list = [...list].sort((a, b) => (typeof b.rating === "number" ? b.rating : 0) - (typeof a.rating === "number" ? a.rating : 0));
    return list;
  }, [hotels, search.location, maxPrice, minRating, amenities, types, sort]);

  const deals = useMemo(() => filtered.filter((h) => h.isDeal), [filtered]);
  const toggle = (a: string, set: (v: string[]) => void, list: string[]) => set(list.includes(a) ? list.filter((x) => x !== a) : [...list, a]);
  const clearAll = () => { setMaxPrice(5000); setMinRating(0); setAmenities([]); setTypes([]); };
  const activeFilterCount = (maxPrice !== 5000 ? 1 : 0) + (minRating ? 1 : 0) + amenities.length + types.length;

  return (
    <Layout>
      {/* ── Payment result toast ─────────────────────────── */}
      {paymentToast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg text-sm font-semibold animate-fade-in max-w-md w-full mx-4
          ${paymentToast === "cancelled"
            ? "bg-yellow-500/15 border border-yellow-500/40 text-yellow-700 dark:text-yellow-300"
            : "bg-destructive/15 border border-destructive/40 text-destructive"
          }`}>
          <X className="w-4 h-4 shrink-0" />
          <span>
            {paymentToast === "cancelled"
              ? "Payment cancelled. Your booking has been released. Choose a room to try again."
              : "Payment failed. Your card was declined. Please try a different payment method."}
          </span>
          <button onClick={() => setPaymentToast(null)} className="ml-auto opacity-60 hover:opacity-100 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-gradient-to-br from-secondary via-background to-secondary/50 min-h-screen">
        <div className="container py-8">
          <div className="grid lg:grid-cols-[300px_1fr] gap-8">
          {/* SIDEBAR */}
          <aside className="lg:sticky lg:top-20 lg:self-start space-y-5 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto pr-1">
            <div className="rounded-xl border border-border overflow-hidden bg-card">
              <div className="h-60 relative">
                <HotelMap hotels={filtered} onHotelClick={(id) => nav(`/hotel/${id}`)} />
              </div>
              <button onClick={() => setMapOpen(true)} className="w-full flex items-center justify-center gap-2 py-3 text-xs font-semibold text-primary border-t border-border hover:bg-secondary transition-base">
                <Maximize2 className="w-3.5 h-3.5" /> Explore Map
              </button>
            </div>

            <div className="flex items-center justify-between px-1">
              <h2 className="font-display text-lg font-bold text-primary">
                Filters {activeFilterCount > 0 && <span className="text-xs text-accent">({activeFilterCount})</span>}
              </h2>
              <button onClick={clearAll} className="text-xs text-brown font-semibold hover:text-accent transition-base">Clear all</button>
            </div>

            <FilterCard title="Price Range">
              <div className="flex items-center justify-between text-sm font-medium text-primary mb-2">
                <span className="text-muted-foreground text-xs">$0</span><span>${maxPrice}</span>
              </div>
              <input type="range" min={100} max={5000} step={50} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full accent-primary" />
            </FilterCard>

            <FilterCard title="Property Type">
              <div className="flex flex-wrap gap-1.5">
                {PROPERTY_TYPES.map((t) => {
                  const active = types.includes(t);
                  return (
                    <button key={t} onClick={() => toggle(t, setTypes, types)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-base ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background text-primary border-border hover:border-brown"}`}>
                      {t}
                    </button>
                  );
                })}
              </div>
            </FilterCard>

            <FilterCard title="Minimum Rating">
              {[0, 3, 4, 4.5].map((r) => (
                <label key={r} className="flex items-center gap-2 py-1.5 cursor-pointer">
                  <input type="radio" name="rating" checked={minRating === r} onChange={() => setMinRating(r)} className="accent-primary" />
                  <span className="text-sm text-primary">{r === 0 ? "Any" : `${r}+ stars`}</span>
                </label>
              ))}
            </FilterCard>

            <FilterCard title="Amenities">
              {ALL_AMENITIES.map((a) => (
                <label key={a} className="flex items-center gap-2 py-1.5 cursor-pointer">
                  <input type="checkbox" checked={amenities.includes(a)} onChange={() => toggle(a, setAmenities, amenities)} className="accent-primary" />
                  <span className="text-sm text-primary">{a}</span>
                </label>
              ))}
            </FilterCard>
          </aside>

          {/* RIGHT */}
          <section className="space-y-8 min-w-0">
            {deals.length > 0 && <TopDeals deals={deals} onView={(id) => nav(`/hotel/${id}`)} />}

            <div className="flex items-end justify-between gap-3 flex-wrap">
              <div>
                <h1 className="font-display text-2xl md:text-3xl font-bold text-primary">
                  {search.location ? `Stays in ${search.location}` : "All Premium Stays"}
                </h1>
                <p className="text-muted-foreground text-sm mt-1">Showing {filtered.length} curated properties</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Hotel name search with dropdown */}
                <div className="relative">
                  <form
                    onSubmit={(e) => { e.preventDefault(); applyNameSearch(); }}
                    className="flex items-center"
                  >
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <input
                        type="text"
                        value={nameSearch}
                        onChange={(e) => { setNameSearch(e.target.value); setNameDropdown(true); if (!e.target.value.trim()) { setNameFilter(""); } }}
                        onFocus={() => setNameDropdown(true)}
                        onBlur={() => setTimeout(() => setNameDropdown(false), 150)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyNameSearch(); } if (e.key === "Escape") { setNameDropdown(false); } }}
                        placeholder="Search hotel name..."
                        aria-label="Search hotels by name"
                        autoComplete="off"
                        className="pl-9 pr-8 py-2 border border-border rounded-l-lg bg-background text-sm text-primary outline-none focus:border-accent w-[190px]"
                      />
                      {nameSearch && (
                        <button
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); setNameSearch(""); setNameFilter(""); setNameDropdown(false); }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <button
                      type="submit"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 rounded-r-lg border border-primary text-sm font-medium transition-base flex items-center gap-1.5"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </form>
                  {nameDropdown && nameSuggestions.length > 0 && (
                    <div className="absolute left-0 top-full mt-1 bg-popover border border-border rounded-xl shadow-luxe z-50 overflow-hidden w-[240px]">
                      {nameSuggestions.map((name) => {
                        const q = nameSearch.trim().toLowerCase();
                        const idx = name.toLowerCase().indexOf(q);
                        return (
                          <button
                            key={name}
                            onMouseDown={(e) => { e.preventDefault(); setNameSearch(name); applyNameSearch(name); }}
                            className="w-full text-left px-4 py-2.5 hover:bg-accent/10 text-sm text-primary transition-base flex items-center gap-2"
                          >
                            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span>
                              {name.slice(0, idx)}
                              <span className="font-bold text-accent">{name.slice(idx, idx + q.length)}</span>
                              {name.slice(idx + q.length)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex border border-border rounded-lg overflow-hidden">
                  <button onClick={() => setView("list")} className={`p-2 transition-base ${view === "list" ? "bg-primary text-primary-foreground" : "text-primary hover:bg-secondary"}`} aria-label="List view"><List className="w-4 h-4" /></button>
                  <button onClick={() => setView("grid")} className={`p-2 transition-base ${view === "grid" ? "bg-primary text-primary-foreground" : "text-primary hover:bg-secondary"}`} aria-label="Grid view"><LayoutGrid className="w-4 h-4" /></button>
                </div>
                <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="bg-background border border-border rounded-lg px-3 py-2 text-sm font-medium text-primary outline-none focus:border-accent">
                  <option value="rating">Top Rated</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="space-y-5">{[1, 2, 3].map((i) => <div key={i} className="h-48 bg-secondary rounded-2xl animate-pulse" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 bg-secondary/50 rounded-2xl border border-border">
                <X className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-primary font-semibold">No properties match your filters</p>
                <button onClick={clearAll} className="mt-3 text-accent text-sm font-semibold hover:underline">Clear filters</button>
              </div>
            ) : view === "list" ? (
              <div className="space-y-5">{filtered.map((h) => <HotelListCard key={h.id} hotel={h} onView={() => nav(`/hotel/${h.id}`)} />)}</div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-5">{filtered.map((h) => <HotelGridCard key={h.id} hotel={h} onView={() => nav(`/hotel/${h.id}`)} />)}</div>
            )}
          </section>
        </div>
        </div>
      </div>

      {mapOpen && (
        <div className="fixed inset-0 z-50 bg-primary/60 backdrop-blur-sm p-4 md:p-8 animate-fade-in" onClick={() => setMapOpen(false)}>
          <div className="bg-background rounded-2xl overflow-hidden h-full max-w-6xl mx-auto flex flex-col shadow-luxe" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div>
                <h3 className="font-display font-bold text-primary">Map View</h3>
                <p className="text-xs text-muted-foreground">{filtered.length} properties</p>
              </div>
              <button onClick={() => setMapOpen(false)} className="w-9 h-9 grid place-items-center rounded-lg hover:bg-secondary transition-base">
                <X className="w-4 h-4 text-primary" />
              </button>
            </div>
            <div className="flex-1">
              <HotelMap hotels={filtered} onHotelClick={(id) => { setMapOpen(false); nav(`/hotel/${id}`); }} />
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

const FilterCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-card border border-border rounded-xl p-4">
    <h3 className="font-semibold text-primary mb-3 text-sm">{title}</h3>
    {children}
  </div>
);

const TopDeals = ({ deals, onView }: { deals: any[]; onView: (id: string) => void }) => {
  const scroll = (dir: "l" | "r") => {
    const el = document.getElementById("deals-rail");
    if (el) el.scrollBy({ left: dir === "l" ? -340 : 340, behavior: "smooth" });
  };
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-accent/15 text-accent"><Flame className="w-4 h-4" /></span>
          <div>
            <h2 className="font-display text-lg font-bold text-primary">Top Deals</h2>
            <p className="text-xs text-muted-foreground">Limited-time premium offers</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => scroll("l")} className="w-8 h-8 grid place-items-center rounded-lg border border-border hover:bg-secondary transition-base"><ChevronLeft className="w-4 h-4 text-primary" /></button>
          <button onClick={() => scroll("r")} className="w-8 h-8 grid place-items-center rounded-lg border border-border hover:bg-secondary transition-base"><ChevronRight className="w-4 h-4 text-primary" /></button>
        </div>
      </div>
      <div id="deals-rail" className="flex gap-4 overflow-x-auto scroll-smooth pb-2 -mx-1 px-1 snap-x">
        {deals.map((h) => (
          <article key={h.id} onClick={() => onView(h.id)} className="snap-start min-w-[280px] max-w-[280px] bg-background rounded-xl overflow-hidden border border-border hover:shadow-elegant transition-base hover:scale-[1.02] group cursor-pointer">
            <div className="relative aspect-[16/10] overflow-hidden">
              <img src={h.image} alt={h.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-base duration-500" />
              <span className="absolute top-2 left-2 bg-accent text-accent-foreground text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded">Top Deal</span>
              {h.discountPct && <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1 rounded">-{h.discountPct}%</span>}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-semibold text-primary text-sm truncate">{h.name}</h3>
                {typeof h.rating === "number" && h.rating > 0 && (
                  <span className="text-xs font-semibold text-primary flex items-center gap-0.5 shrink-0"><Star className="w-3 h-3 fill-accent text-accent" />{h.rating}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate mb-3">{h.location}</p>
              <div className="flex items-end justify-between">
                <div>
                  {h.originalPrice && <span className="text-[11px] text-muted-foreground line-through mr-1">${h.originalPrice}</span>}
                  <span className="font-display text-lg font-bold text-primary">${h.pricePerNight}</span>
                  <span className="text-[11px] text-muted-foreground">/night</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onView(h.id); }} className="text-xs font-semibold bg-accent text-accent-foreground px-3 py-1.5 rounded-md hover:bg-accent/90 transition-base">Book Now</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

const HotelListCard = ({ hotel: h, onView }: { hotel: any; onView: () => void }) => {
  const totalAvail = h.rooms.reduce((s: number, r: any) => s + r.available, 0);
  return (
    <article onClick={onView} className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-elegant hover:border-brown/40 transition-base group animate-fade-in cursor-pointer">
      <div className="grid md:grid-cols-[260px_1fr_auto]">
        <div className="relative aspect-[4/3] md:aspect-auto md:h-full overflow-hidden">
          <img src={h.image} alt={h.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-base duration-500" />
          {h.isDeal && <span className="absolute top-3 left-3 bg-accent text-accent-foreground text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded">Top Deal</span>}
        </div>
        <div className="p-5 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-lg font-bold text-primary">{h.name}</h3>
            <div className="flex items-center gap-1 text-sm font-semibold whitespace-nowrap">
              {typeof h.rating === "number" && h.rating > 0 ? (
                <>
                  <Star className="w-4 h-4 fill-accent text-accent" /> {h.rating}
                  <span className="text-muted-foreground font-normal">({h.reviewCount})</span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">No reviews yet</span>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {h.location}</p>
          <div className="flex flex-wrap gap-1.5">
            {h.amenities.slice(0, 4).map((a: string) => <span key={a} className="text-xs px-2.5 py-1 rounded-md bg-secondary text-brown font-medium">{a}</span>)}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{h.description}</p>
        </div>
        <div className="p-5 border-t md:border-t-0 md:border-l border-border flex md:flex-col items-end md:items-end justify-between md:justify-center gap-3 md:min-w-[170px]">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Starting from</p>
            {h.originalPrice && <p className="text-xs text-muted-foreground line-through">${h.originalPrice}</p>}
            <p className="font-display text-2xl font-bold text-primary">${h.pricePerNight}</p>
            <p className="text-xs text-muted-foreground">per night</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onView(); }} className="bg-accent hover:bg-accent/90 text-accent-foreground px-5 py-2.5 rounded-lg font-semibold text-sm transition-base">View Details</button>
        </div>
      </div>
    </article>
  );
};

const HotelGridCard = ({ hotel: h, onView }: { hotel: any; onView: () => void }) => (
  <article onClick={onView} className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-elegant hover:border-brown/40 transition-base hover:scale-[1.02] group animate-fade-in cursor-pointer">
    <div className="relative aspect-[4/3] overflow-hidden">
      <img src={h.image} alt={h.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-base duration-500" />
      {h.isDeal && <span className="absolute top-3 left-3 bg-accent text-accent-foreground text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded">Top Deal</span>}
      {typeof h.rating === "number" && h.rating > 0 && (
        <div className="absolute top-3 right-3 bg-background/95 backdrop-blur px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1">
          <Star className="w-3 h-3 fill-accent text-accent" /> {h.rating}
        </div>
      )}
    </div>
    <div className="p-5">
      <h3 className="font-display text-lg font-bold text-primary truncate">{h.name}</h3>
      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3.5 h-3.5" /> {h.location}</p>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {h.amenities.slice(0, 3).map((a: string) => <span key={a} className="text-xs px-2 py-0.5 rounded-md bg-secondary text-brown font-medium">{a}</span>)}
      </div>
      <div className="flex items-end justify-between mt-4 pt-4 border-t border-border">
        <div>
          <p className="text-[11px] text-muted-foreground">From</p>
          <p className="font-display text-xl font-bold text-primary">${h.pricePerNight}<span className="text-xs text-muted-foreground font-normal">/night</span></p>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onView(); }} className="bg-accent hover:bg-accent/90 text-accent-foreground px-4 py-2 rounded-lg font-semibold text-sm transition-base">View</button>
      </div>
    </div>
  </article>
);

export default Hotels;
