import React, { createContext, useContext, useEffect, useState } from "react";
import api from "@/services/api";
import { useBooking } from "@/context/BookingContext";
import { toast } from "sonner";

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
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set());
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

    if (loadingItems.has(hotelId)) return;
    setLoadingItems((prev) => new Set(prev).add(hotelId));

    const wasWishlisted = wishlist.includes(hotelId);

    // Optimistic update
    setWishlist((prev) => {
      if (prev.includes(hotelId)) {
        return prev.filter((id) => id !== hotelId);
      } else {
        return [...prev, hotelId];
      }
    });

    if (wasWishlisted) {
      toast.success("Removed from wishlist");
    } else {
      toast.success("Added to wishlist successfully ❤️");
    }

    try {
      const res = await api.post("/auth/wishlist", { hotelId });
      if (res.data.success) {
        setWishlist(res.data.data);
      }
    } catch (err) {
      console.error("Failed to sync wishlist", err);
      // Revert optimistic update on failure
      setWishlist((prev) => {
        if (wasWishlisted) {
          return [...prev, hotelId];
        } else {
          return prev.filter((id) => id !== hotelId);
        }
      });
      toast.error("Failed to update wishlist. Please try again.");
    } finally {
      setLoadingItems((prev) => {
        const next = new Set(prev);
        next.delete(hotelId);
        return next;
      });
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
