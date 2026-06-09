import Layout from "@/components/Layout";
import { useWishlist } from "@/context/WishlistContext";
import { useBooking } from "@/context/BookingContext";
import { useCurrency } from "@/context/CurrencyContext";
import { Heart, MapPin, Star, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Wishlist = () => {
  const { wishlist, toggleWishlist } = useWishlist();
  const { hotels } = useBooking();
  const { format } = useCurrency();
  const nav = useNavigate();

  const wishlistedHotels = hotels.filter((h) => wishlist.includes(h.id));

  return (
    <Layout>
      <div className="container py-12 min-h-[60vh]">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-primary flex items-center gap-3">
            <Heart className="w-8 h-8 fill-red-500 text-red-500" /> My Favorites
          </h1>
          <p className="text-muted-foreground mt-2">
            You have {wishlistedHotels.length} saved {wishlistedHotels.length === 1 ? "property" : "properties"}.
          </p>
        </div>

        {wishlistedHotels.length === 0 ? (
          <div className="bg-secondary/50 rounded-2xl border border-border p-12 text-center max-w-2xl mx-auto mt-10">
            <div className="w-16 h-16 bg-background rounded-full grid place-items-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h2 className="text-xl font-bold text-primary mb-2">Your wishlist is empty</h2>
            <p className="text-muted-foreground mb-6">
              Save your favorite properties by clicking the heart icon on any hotel.
            </p>
            <button
              onClick={() => nav("/hotels")}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-base"
            >
              Explore Hotels <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlistedHotels.map((h) => (
              <article key={h.id} onClick={() => nav(`/hotel/${h.id}`)} className="group text-left animate-fade-in hover:-translate-y-1 transition-base cursor-pointer">
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl mb-3 shadow-elegant hover:shadow-luxe transition-base">
                  <img src={h.image} alt={h.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-base duration-500" />
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleWishlist(h.id); }} 
                    className="absolute top-3 left-3 bg-background/95 backdrop-blur w-8 h-8 rounded-full grid place-items-center hover:scale-110 transition-transform shadow-md border border-border/50"
                    aria-label="Remove from wishlist"
                  >
                    <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                  </button>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-primary group-hover:text-accent transition-base">{h.name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-3.5 h-3.5" /> {h.location}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary whitespace-nowrap">
                      From {format(h.pricePerNight)}<span className="text-muted-foreground font-normal">/night</span>
                    </p>
                    {typeof h.rating === "number" && h.rating > 0 && (
                      <p className="text-xs font-semibold text-primary flex items-center gap-1 justify-end mt-1"><Star className="w-3 h-3 fill-accent text-accent" />{h.rating}</p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Wishlist;
