import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

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
            { label: "About Us",    to: "/about" },
            { label: "Careers",     to: "/careers" },
            { label: "Press",       to: "/press" },
            { label: "Contact Us",  to: "/contact" },
          ].map(({ label, to }) => (
            <li key={to}>
              <Link to={to} className="hover:text-primary-foreground transition-colors">{label}</Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Support */}
      <div>
        <h4 className="text-primary-foreground/90 text-sm font-semibold uppercase tracking-wider mb-4">Support</h4>
        <ul className="space-y-2.5 text-primary-foreground/70 text-sm">
          {[
            { label: "Help Center",      to: "/help" },
            { label: "Support",          to: "/support" },
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
        <form onSubmit={(e) => e.preventDefault()} className="space-y-2">
          <input
            type="email"
            placeholder="name@example.com"
            aria-label="Newsletter email"
            className="w-full px-4 py-2.5 rounded-lg bg-primary-foreground/10 border border-primary-foreground/20 text-primary-foreground placeholder-primary-foreground/40 text-sm outline-none focus:border-primary-foreground/50 transition-colors"
          />
          <button type="submit"
            className="w-full bg-primary-foreground text-primary font-semibold py-2.5 rounded-lg text-sm hover:bg-primary-foreground/90 transition-colors">
            Subscribe
          </button>
        </form>
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
