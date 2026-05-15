import { createContext, useContext, ReactNode } from "react";

export type Visitor = {
  id: string;
  ip: string;
  country: string;
  countryCode: string;
  city: string;
  device: "Desktop" | "Mobile" | "Tablet";
  browser: string;
  os: string;
  page: string;
  referrer: string;
  duration: number;
  visitedAt: string;
  status: "Active" | "Bounced" | "Converted";
};

type VisitorCtx = { visitors: Visitor[] };

const Ctx = createContext<VisitorCtx | null>(null);

// No demo data — Insights page fetches directly from backend
export const VisitorProvider = ({ children }: { children: ReactNode }) => (
  <Ctx.Provider value={{ visitors: [] }}>{children}</Ctx.Provider>
);

export const useVisitors = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useVisitors must be used within VisitorProvider");
  return ctx;
};
