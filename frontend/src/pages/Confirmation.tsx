import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Calendar, Users, ArrowRight } from "lucide-react";
import Layout from "@/components/Layout";
import { useBooking } from "@/context/BookingContext";
import { markSessionConverted } from "@/hooks/use-visitor-tracker";

const Confirmation = () => {
  const nav = useNavigate();
  const { bookings } = useBooking();
  const latest = bookings[0];

  useEffect(() => { if (!latest) nav("/"); }, [latest, nav]);
  // Mark this session as converted in the admin Insights panel
  useEffect(() => { if (latest) markSessionConverted(); }, [latest]);
  if (!latest) return null;

  return (
    <Layout>
      <div className="container py-12 max-w-2xl">
        <div className="bg-card border border-border rounded-2xl p-8 md:p-12 text-center animate-fade-in">
          <div className="grid place-items-center w-20 h-20 mx-auto bg-accent rounded-full mb-6">
            <Check className="w-10 h-10 text-accent-foreground" strokeWidth={3} />
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">Booking Confirmed!</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Your reservation at <strong>{latest.hotel.name}</strong> is confirmed. Booking ID <strong>#{latest.id}</strong> has been saved to your history.
          </p>
          <div className="mt-8 p-5 bg-secondary/60 rounded-xl flex items-center justify-between text-left">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Booking ID</p>
              <p className="font-display text-2xl font-bold text-primary mt-1">#{latest.id}</p>
            </div>
            <span className="bg-accent/15 text-accent px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider">Payment Successful</span>
          </div>
          <div className="mt-6 flex gap-4 items-start text-left border-t border-border pt-6">
            <img src={latest.hotel.image} alt="" className="w-24 h-24 object-cover rounded-xl" />
            <div className="flex-1">
              <h3 className="font-display text-xl font-bold">{latest.hotel.name}</h3>
              <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {latest.search.checkIn} → {latest.search.checkOut} ({latest.nights} nights)</p>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {latest.search.guests} guests · {latest.room.name}</p>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Paid</span>
            <span className="font-display text-2xl font-bold text-accent">${latest.total.toLocaleString()}</span>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button onClick={() => nav("/history")}
              className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-base">
              Go to History <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => nav("/hotels")}
              className="flex-1 bg-secondary hover:bg-secondary/80 text-primary py-3.5 rounded-xl font-semibold transition-base">
              Browse More Hotels
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Confirmation;
