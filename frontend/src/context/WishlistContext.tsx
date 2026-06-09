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

  // Load wishlist from user if logged in, otherwise empty array
  useEffect(() => {
    if (user && user.wishlist) {
      setWishlist(user.wishlist);
    } else {
      setWishlist([]);
    }
  }, [user]);

  // Reset state on global logout event
  useEffect(() => {
    const handleLogout = () => {
      setWishlist([]);
      localStorage.removeItem("luxestay_wishlist");
    };
    window.addEventListener("luxe_logout", handleLogout);
    return () => window.removeEventListener("luxe_logout", handleLogout);
  }, []);

  const toggleWishlist = async (hotelId: string) => {
    if (!user) {
      window.dispatchEvent(new Event("luxe_open_auth"));
      return;
    }

    // Optimistic update
    setWishlist((prev) => {
      if (prev.includes(hotelId)) {
        return prev.filter((id) => id !== hotelId);
      } else {
        return [...prev, hotelId];
      }
    });

    try {
      const res = await api.post("/auth/wishlist", { hotelId });
      if (res.data.success) {
        setWishlist(res.data.data);
      }
    } catch (err) {
      console.error("Failed to sync wishlist", err);
    }
  };

  const isWishlisted = (hotelId: string) => user ? wishlist.includes(hotelId) : false;

  return (
    <WishlistContext.Provider value={{ wishlist, toggleWishlist, isWishlisted }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);
