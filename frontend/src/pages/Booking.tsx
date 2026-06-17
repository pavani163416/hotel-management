import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Calendar, Users, BedDouble, MapPin, ArrowRight, Minus, Plus } from "lucide-react";
import Layout from "@/components/Layout";
import Stepper from "@/components/Stepper";
import { useBooking, calcNights } from "@/context/BookingContext";
import { useCurrency } from "@/context/CurrencyContext";

const Booking = () => {
  const nav = useNavigate();
  const { selectedHotel, selectedRoom, search, setSearch } = useBooking();
  const { format } = useCurrency();

  useEffect(() => { if (!selectedHotel || !selectedRoom) nav("/hotels"); }, [selectedHotel, selectedRoom, nav]);
  if (!selectedHotel || !selectedRoom) return null;

  const nights = calcNights(search.checkIn, search.checkOut);
  const subtotal = selectedRoom.price * nights;
  const maxGuests = Math.max(1, selectedRoom.capacity || 1);

  useEffect(() => {
    if (search.guests > maxGuests) {
      setSearch({ ...search, guests: maxGuests });
    }
  }, [maxGuests, search, setSearch]);

  const adjustNights = (delta: number) => {
    const checkOut = new Date(search.checkOut);
    checkOut.setDate(checkOut.getDate() + delta);
    const newNights = calcNights(search.checkIn, checkOut.toISOString().slice(0, 10));
    if (newNights < 1) return;
    setSearch({ ...search, checkOut: checkOut.toISOString().slice(0, 10) });
  };

  return (
    <Layout>
      <div className="container py-8 max-w-4xl">
        <Stepper current={0} />
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Your Selection</h1>
        <p className="text-muted-foreground mb-8">Confirm your stay details before continuing.</p>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <img src={selectedHotel.image} alt={selectedHotel.name} className="w-full h-64 object-cover" />
          <div className="p-6 space-y-5">
            <div>
              <h2 className="font-display text-2xl font-bold">{selectedHotel.name}</h2>
              <p className="text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-4 h-4" /> {selectedHotel.location}</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 py-4 border-y border-border">
              <Info icon={<BedDouble className="w-4 h-4" />} label="Room" value={selectedRoom.name} />
              {/* Editable dates */}
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5 mb-1">
                  <Calendar className="w-4 h-4" /> Dates
                </p>
                <div className="flex flex-col gap-1">
                  <input type="date" value={search.checkIn}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => {
                      const newIn = e.target.value;
                      // Ensure checkout is after checkin
                      const newOut = newIn >= search.checkOut
                        ? new Date(new Date(newIn).getTime() + 86400000).toISOString().slice(0, 10)
                        : search.checkOut;
                      setSearch({ ...search, checkIn: newIn, checkOut: newOut });
                    }}
                    className="border border-border rounded-lg px-2 py-1 outline-none focus:border-primary bg-transparent"
                    style={{ fontSize: '16px' }} />
                  <input type="date" value={search.checkOut}
                    min={new Date(new Date(search.checkIn).getTime() + 86400000).toISOString().slice(0, 10)}
                    onChange={(e) => setSearch({ ...search, checkOut: e.target.value })}
                    className="border border-border rounded-lg px-2 py-1 outline-none focus:border-primary bg-transparent"
                    style={{ fontSize: '16px' }} />
                </div>
              </div>
              {/* Editable nights */}
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5 mb-1">
                  <Users className="w-4 h-4" /> Duration
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => adjustNights(-1)} disabled={nights <= 1}
                    className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-secondary disabled:opacity-40 transition-base">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-semibold text-primary text-sm w-16 text-center">{nights} night{nights !== 1 ? "s" : ""}</span>
                  <button onClick={() => adjustNights(1)}
                    className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-base">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                {/* Editable guests */}
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => setSearch({ ...search, guests: Math.max(1, search.guests - 1) })}
                    disabled={search.guests <= 1}
                    className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-secondary disabled:opacity-40 transition-base">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-sm text-muted-foreground w-16 text-center">{search.guests} guest{search.guests !== 1 ? "s" : ""}</span>
                  <button onClick={() => setSearch({ ...search, guests: Math.min(maxGuests, search.guests + 1) })}
                    disabled={search.guests >= maxGuests}
                    className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-base">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Maximum {maxGuests} guest{maxGuests !== 1 ? "s" : ""} for this room.</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Subtotal ({nights} nights)</p>
                <p className="font-display text-3xl font-bold text-primary">{format(subtotal)}</p>
              </div>
              <button onClick={() => nav("/guest-details")}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3.5 rounded-xl font-semibold flex items-center gap-2 transition-base">
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

const Info = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div>
    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5 mb-1">{icon} {label}</p>
    <p className="font-medium text-primary text-sm">{value}</p>
  </div>
);

export default Booking;
