import React, { createContext, useContext, useEffect, useState } from "react";
import api from "@/services/api";
import { useBooking } from "@/context/BookingContext";

interface WishlistContextType {
  wishlist: string[];
  toggleWishlist: (hotelId: string) => void;
  isWishlisted: (hotelId: string) => boolean;
}

const WishlistContext = createContext<WishlistContextType>({
  wishlist: [],
  toggleWishlist: () => {},
  isWishlisted: () => false,
});

export const WishlistProvider = ({ children }: { children: React.ReactNode }) => {
  const [wishlist, setWishlist] = useState<string[]>([]);
  const { user } = useBooking();

  // Load wishlist from user if logged in, otherwise from localStorage
  useEffect(() => {
    if (user && user.wishlist) {
      setWishlist(user.wishlist);
    } else if (!user) {
      const stored = localStorage.getItem("luxestay_wishlist");
      if (stored) {
        try { setWishlist(JSON.parse(stored)); } catch (e) {}
      } else {
        setWishlist([]);
      }
    }
  }, [user]);

  const toggleWishlist = async (hotelId: string) => {
    // Optimistic update
    setWishlist((prev) => {
      let next;
      if (prev.includes(hotelId)) next = prev.filter((id) => id !== hotelId);
      else next = [...prev, hotelId];
      if (!user) localStorage.setItem("luxestay_wishlist", JSON.stringify(next));
      return next;
    });

    if (user) {
      try {
        const res = await api.post("/auth/wishlist", { hotelId });
        if (res.data.success) setWishlist(res.data.data);
      } catch (err) {
        console.error("Failed to sync wishlist", err);
      }
    }
  };

  const isWishlisted = (hotelId: string) => wishlist.includes(hotelId);

  return (
    <WishlistContext.Provider value={{ wishlist, toggleWishlist, isWishlisted }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);
