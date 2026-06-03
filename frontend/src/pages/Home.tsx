import { useNavigate } from "react-router-dom";
import { MapPin, Calendar, Users, Search, Star, ArrowRight, Sparkles, ShieldCheck, Headphones } from "lucide-react";
import { useBooking } from "@/context/BookingContext";
import Layout from "@/components/Layout";
import { useState, useMemo } from "react";
import hero3d from "@/assets/hero-3d.png";

const HERO_IMG = hero3d;

const TOP_DESTINATIONS = [
  { city: "New York", country: "United States", code: "NYC", desc: "Premium stays in Manhattan" },
  { city: "Los Angeles", country: "United States", code: "LAX", desc: "Luxury villas & resorts" },
  { city: "Paris", country: "France", code: "PAR", desc: "Boutique hotels & suites" },
  { city: "London", country: "United Kingdom", code: "LON", desc: "Historic luxury stays" },
  { city: "Tokyo", country: "Japan", code: "TYO", desc: "Modern skyline hotels" },
  { city: "Dubai", country: "United Arab Emirates", code: "DXB", desc: "Ultra-luxury resorts" },
  { city: "Bali", country: "Indonesia", code: "DPS", desc: "Tropical private villas" },
  { city: "Rome", country: "Italy", code: "ROM", desc: "Classic elegance" },
  { city: "Sydney", country: "Australia", code: "SYD", desc: "Harbour view properties" },
  { city: "Singapore", country: "Singapore", code: "SIN", desc: "Urban luxury oasis" },
];

const Home = () => {
  const nav = useNavigate();
  const { search, setSearch, hotels } = useBooking();
  const [local, setLocal] = useState(search);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const query = local.location.trim().toLowerCase();
  const filteredLocations = useMemo(() => {
    if (!query) return [];
    const set = new Set<string>();
    hotels.forEach((h) => {
      if (h.city && h.city.toLowerCase().includes(query)) {
        set.add(h.city);
      }
      if (h.location && h.location.toLowerCase().includes(query)) {
        set.add(h.location);
      }
    });
    return Array.from(set);
  }, [hotels, query]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(local);
    nav("/hotels");
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-secondary via-background to-secondary/50">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 -left-20 w-72 h-72 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-brown/5 blur-3xl" />
        </div>

        <div className="container relative pt-16 pb-12 grid lg:grid-cols-2 gap-10 items-center">
          <div className="text-left animate-fade-in">
            <span className="inline-flex items-center gap-2 bg-accent/15 text-brown text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full">
              <Sparkles className="w-3.5 h-3.5" /> Curated Luxury Stays
            </span>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-primary tracking-tight mt-5 leading-[1.05]">
              Discover <span className="text-accent">Extraordinary</span><br /> Stays Worldwide
            </h1>
            <p className="mt-5 text-muted-foreground text-base md:text-lg max-w-lg">
              Hand-picked hotels and private residences with a seamless, concierge-driven booking experience.
            </p>
            <div className="mt-8 flex flex-wrap gap-6 text-sm">
              <Stat value={hotels.length > 0 ? `${hotels.length}+` : "..."} label="Premium hotels" />
              <Stat value="98%" label="Guest satisfaction" />
              <Stat value="24/7" label="Concierge" />
            </div>
          </div>

          <div className="relative flex justify-center items-center animate-fade-in">
            <div className="absolute inset-0 bg-gradient-to-tr from-accent/20 via-transparent to-brown/10 rounded-full blur-3xl" />
            <img src={HERO_IMG} alt="Premium boutique hotel"
              className="relative w-full max-w-[560px] drop-shadow-[0_30px_50px_hsl(60_14%_8%_/_0.18)] hover:scale-[1.02] transition-base duration-500 mix-blend-multiply" />
          </div>
        </div>

        {/* Search bar */}
        <div className="container relative z-10 pb-16">
          <form onSubmit={submit}
            className="bg-card rounded-2xl shadow-luxe border border-border p-2 grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-1 max-w-5xl mx-auto">
            
            <div className="relative">
              <Field icon={<MapPin className="w-4 h-4" />} label="Location">
                <input 
                  value={local.location} 
                  onChange={(e) => {
                    setLocal({ ...local, location: e.target.value });
                    setDropdownOpen(true);
                  }}
                  onFocus={() => setDropdownOpen(true)}
                  onBlur={() => {
                    setTimeout(() => setDropdownOpen(false), 200);
                  }}
                  placeholder="Where to?" 
                  className="w-full bg-transparent outline-none text-sm font-medium text-primary placeholder:text-muted-foreground" 
                />
              </Field>

              {dropdownOpen && filteredLocations.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-popover border border-border rounded-xl shadow-luxe z-50 max-h-60 overflow-y-auto p-1.5 space-y-0.5">
                  {filteredLocations.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                      }}
                      onClick={() => {
                        setLocal({ ...local, location: loc });
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2.5 rounded-lg hover:bg-accent hover:text-accent-foreground text-sm font-medium text-primary flex items-center gap-2 transition-base"
                    >
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span>{loc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Field icon={<Calendar className="w-4 h-4" />} label="Check in">
              <input type="date" value={local.checkIn} onChange={(e) => setLocal({ ...local, checkIn: e.target.value })}
                className="w-full bg-transparent outline-none text-sm font-medium text-primary" />
            </Field>
            <Field icon={<Calendar className="w-4 h-4" />} label="Check out">
              <input type="date" value={local.checkOut} onChange={(e) => setLocal({ ...local, checkOut: e.target.value })}
                className="w-full bg-transparent outline-none text-sm font-medium text-primary" />
            </Field>
            <Field icon={<Users className="w-4 h-4" />} label="Guests">
              <input type="number" min={1} max={8} value={local.guests}
                onChange={(e) => setLocal({ ...local, guests: Number(e.target.value) })}
                className="w-full bg-transparent outline-none text-sm font-medium text-primary" />
            </Field>
            <button type="submit"
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-6 py-4 font-semibold text-sm flex items-center justify-center gap-2 transition-base">
              <Search className="w-4 h-4" /> Search
            </button>
          </form>
        </div>
      </section>

      {/* Trust strip */}
      <section className="bg-gradient-to-br from-secondary via-background to-secondary/50">
        <div className="container py-6 grid sm:grid-cols-3 gap-6">
          <Trust icon={<ShieldCheck className="w-5 h-5" />} title="Best Price Guarantee" desc="Found a lower price? We'll match it." />
          <Trust icon={<Sparkles className="w-5 h-5" />} title="Curated Properties" desc="Only hand-picked premium stays." />
          <Trust icon={<Headphones className="w-5 h-5" />} title="24/7 Concierge" desc="Real human support, anytime." />
        </div>
      </section>

      {/* Featured */}
      <section className="container py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-accent text-xs font-semibold uppercase tracking-widest mb-2">Curated Selection</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold">Featured Destinations</h2>
          </div>
          <button onClick={() => nav("/hotels")} className="hidden md:flex items-center gap-1 text-sm font-medium text-primary hover:text-accent transition-base">
            View all <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...hotels].sort((a, b) => (b.activeBookings || 0) - (a.activeBookings || 0)).slice(0, 6).map((h) => (
            <button key={h.id} onClick={() => nav(`/hotel/${h.id}`)} className="group text-left animate-fade-in hover:-translate-y-1 transition-base">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl mb-3 shadow-elegant hover:shadow-luxe transition-base">
                <img src={h.image} alt={h.name} loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-base duration-500" />
                <div className="absolute top-3 left-3 bg-background/95 backdrop-blur px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1">
                  <Star className="w-3 h-3 fill-accent text-accent" /> {h.rating}
                </div>
              </div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-primary group-hover:text-accent transition-base">{h.name}</h3>
                  <p className="text-sm text-muted-foreground">{h.location}</p>
                </div>
                <p className="text-sm font-semibold text-primary whitespace-nowrap">
                  From ${h.pricePerNight}<span className="text-muted-foreground font-normal">/night</span>
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>
    </Layout>
  );
};

const Field = ({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) => (
  <label className="flex flex-col px-4 py-3 rounded-xl hover:bg-secondary/60 transition-base cursor-text">
    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">{icon} {label}</span>
    <div className="mt-1">{children}</div>
  </label>
);
const Stat = ({ value, label }: { value: string; label: string }) => (
  <div>
    <p className="font-display text-2xl font-bold text-primary">{value}</p>
    <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
  </div>
);
const Trust = ({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) => (
  <div className="flex items-start gap-3 p-4 rounded-xl transition-base hover:bg-accent/10 hover:shadow-elegant hover:-translate-y-0.5 cursor-default">
    <span className="grid place-items-center w-10 h-10 rounded-lg bg-accent/15 text-brown shrink-0 transition-base group-hover:bg-accent/25">{icon}</span>
    <div>
      <p className="font-semibold text-primary text-sm">{title}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  </div>
);

export default Home;
