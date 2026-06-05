import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Currency = "USD" | "INR" | "EUR" | "GBP" | "AED" | "AUD" | "SGD";

// Approximate exchange rates from USD (base)
const RATES: Record<Currency, number> = {
  USD: 1,
  INR: 83.5,
  EUR: 0.92,
  GBP: 0.79,
  AED: 3.67,
  AUD: 1.53,
  SGD: 1.34,
};

const SYMBOLS: Record<Currency, string> = {
  USD: "$",
  INR: "₹",
  EUR: "€",
  GBP: "£",
  AED: "د.إ",
  AUD: "A$",
  SGD: "S$",
};

type CurrencyCtx = {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  format: (amountUSD: number) => string;
  symbol: string;
};

const Ctx = createContext<CurrencyCtx | null>(null);

const detectLocale = (): Currency => {
  try {
    const lang = navigator.language || "";
    if (lang.startsWith("en-IN") || lang.startsWith("hi")) return "INR";
    if (lang.startsWith("en-GB")) return "GBP";
    if (lang.startsWith("en-AU")) return "AUD";
    if (lang.startsWith("en-SG")) return "SGD";
    if (lang.startsWith("ar-AE") || lang.startsWith("ar")) return "AED";
    if (["de", "fr", "es", "it", "nl", "pt"].some((l) => lang.startsWith(l))) return "EUR";
  } catch {}
  return "USD";
};

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const stored = localStorage.getItem("luxe_currency") as Currency;
    if (stored && RATES[stored]) return stored;
    return detectLocale();
  });

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem("luxe_currency", c);
  };

  const format = (amountUSD: number): string => {
    const converted = Math.round(amountUSD * RATES[currency]);
    const sym = SYMBOLS[currency];
    if (currency === "INR") {
      return `${sym}${converted.toLocaleString("en-IN")}`;
    }
    return `${sym}${converted.toLocaleString("en-US")}`;
  };

  return (
    <Ctx.Provider value={{ currency, setCurrency, format, symbol: SYMBOLS[currency] }}>
      {children}
    </Ctx.Provider>
  );
};

export const useCurrency = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
};
