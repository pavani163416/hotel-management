import { Link } from "react-router-dom";
import { useState } from "react";
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin, Loader2, CheckCircle2 } from "lucide-react";

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const NewsletterForm = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg("Please enter your email address.");
      setStatus("error");
      return;
    }
    if (!isValidEmail(email)) {
      setErrorMsg("Please enter a valid email address.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    // Simulate newsletter subscription (no dedicated endpoint — use a brief delay)
    try {
      await new Promise((res) => setTimeout(res, 800));
      setStatus("success");
      setEmail("");
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="flex items-start gap-2 bg-primary-foreground/10 rounded-lg px-4 py-3">
        <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
        <p className="text-primary-foreground/90 text-sm">You're subscribed! Watch your inbox for exclusive deals.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2" noValidate>
      <input
        type="email"
        value={email}
        onChange={(e) => { setEmail(e.target.value); if (status === "error") setStatus("idle"); }}
        placeholder="name@example.com"
        aria-label="Newsletter email address"
        disabled={status === "loading"}
        className="w-full px-4 py-2.5 rounded-lg bg-primary-foreground/10 border border-primary-foreground/20 text-primary-foreground placeholder-primary-foreground/40 text-sm outline-none focus:border-primary-foreground/50 transition-colors disabled:opacity-60"
      />
      {status === "error" && (
        <p role="alert" className="text-red-300 text-xs">{errorMsg}</p>
      )}
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full bg-primary-foreground text-primary font-semibold py-2.5 rounded-lg text-sm hover:bg-primary-foreground/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {status === "loading" ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Subscribing...</>
        ) : (
          "Subscribe"
        )}
      </button>
    </form>
  );
};

const Footer = () => (
  <footer className="bg-primary text-primary-foreground mt-20">
    <div className="container py-14 grid md:grid-cols-4 gap-10">
      {/* Brand */}
      <div className="md:col-span-1">
        <h3 className="text-primary-foreground font-display text-2xl font-bold mb-3">LuxeStay</h3>
        <p className="text-primary-foreground/70 text-sm leading-relaxed max-w-xs mb-5">
          Elevating hospitality through seamless digital experiences and world-class luxury stays.
        </p>
        <div className="space-y-2 text-primary-foreground/70 text-sm">
          <div className="flex items-center gap-2"><Mail className="w-4 h-4" /><span>hello@luxestay.com</span></div>
          <div className="flex items-center gap-2"><Phone className="w-4 h-4" /><span>+1 (800) 123-4567</span></div>
          <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /><span>123 Luxury Ave, New York</span></div>
        </div>
        <div className="flex gap-3 mt-5">
          {[
            { icon: Facebook, label: "Facebook", href: "https://facebook.com" },
            { icon: Twitter, label: "Twitter", href: "https://twitter.com" },
            { icon: Instagram, label: "Instagram", href: "https://instagram.com" },
            { icon: Linkedin, label: "LinkedIn", href: "https://linkedin.com" },
          ].map(({ icon: Icon, label, href }) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
              className="w-8 h-8 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors">
              <Icon className="w-4 h-4" />
            </a>
          ))}
        </div>
      </div>

      {/* Company */}
      <div>
        <h4 className="text-primary-foreground/90 text-sm font-semibold uppercase tracking-wider mb-4">Company</h4>
        <ul className="space-y-2.5 text-primary-foreground/70 text-sm">
          {[
            { label: "About Us",            to: "/about" },
            { label: "Contact Us",          to: "/contact" },
            { label: "Support Centre",      to: "/support-centre" },
            { label: "List Your Property",  to: "/owner-portal" },
          ].map(({ label, to }) => (
            <li key={to}>
              <Link to={to} className="hover:text-primary-foreground transition-colors">{label}</Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Legal */}
      <div>
        <h4 className="text-primary-foreground/90 text-sm font-semibold uppercase tracking-wider mb-4">Legal</h4>
        <ul className="space-y-2.5 text-primary-foreground/70 text-sm">
          {[
            { label: "Terms of Service", to: "/terms" },
            { label: "Privacy Policy",   to: "/privacy" },
          ].map(({ label, to }) => (
            <li key={to}>
              <Link to={to} className="hover:text-primary-foreground transition-colors">{label}</Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Newsletter */}
      <div>
        <h4 className="text-primary-foreground/90 text-sm font-semibold uppercase tracking-wider mb-4">Newsletter</h4>
        <p className="text-primary-foreground/70 text-sm mb-4">Get exclusive deals and travel inspiration.</p>
        <NewsletterForm />
      </div>
    </div>

    <div className="border-t border-primary-foreground/10 py-5 text-center text-primary-foreground/50 text-xs">
      © {new Date().getFullYear()} LuxeStay Hospitality. All rights reserved.
      {" · "}
      <Link to="/terms" className="hover:text-primary-foreground/70 transition-colors">Terms</Link>
      {" · "}
      <Link to="/privacy" className="hover:text-primary-foreground/70 transition-colors">Privacy</Link>
    </div>
  </footer>
);

export default Footer;
