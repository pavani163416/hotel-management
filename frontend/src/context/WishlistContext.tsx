import React, { createContext, useContext, useEffect, useState } from "react";

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

  useEffect(() => {
    const stored = localStorage.getItem("luxestay_wishlist");
    if (stored) {
      try {
        setWishlist(JSON.parse(stored));
      } catch (e) {}
    }
  }, []);

  const toggleWishlist = (hotelId: string) => {
    setWishlist((prev) => {
      let next;
      if (prev.includes(hotelId)) {
        next = prev.filter((id) => id !== hotelId);
      } else {
        next = [...prev, hotelId];
      }
      localStorage.setItem("luxestay_wishlist", JSON.stringify(next));
      return next;
    });
  };

  const isWishlisted = (hotelId: string) => wishlist.includes(hotelId);

  return (
    <WishlistContext.Provider value={{ wishlist, toggleWishlist, isWishlisted }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);
