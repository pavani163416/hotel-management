import { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import CookieConsent from "./CookieConsent";
import { useVisitorTracker } from "@/hooks/use-visitor-tracker";

const Layout = ({ children }: { children: ReactNode }) => {
  useVisitorTracker(); // track every page visit via WebSocket → admin Insights
  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <CookieConsent />
    </div>
  );
};

export default Layout;
