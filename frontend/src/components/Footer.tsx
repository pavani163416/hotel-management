const Footer = () => (
  <footer className="bg-primary text-primary-foreground mt-20">
    <div className="container py-12 grid md:grid-cols-3 gap-8">
      <div>
        <h3 className="text-primary-foreground font-display text-xl font-bold mb-3">LuxeStay</h3>
        <p className="text-primary-foreground/70 text-sm leading-relaxed max-w-xs">
          Elevating hospitality through seamless digital experiences and world-class luxury stays.
        </p>
      </div>
      <div>
        <h4 className="text-primary-foreground/90 text-sm font-semibold uppercase tracking-wider mb-3">Company</h4>
        <ul className="space-y-2 text-primary-foreground/70 text-sm">
          <li>Partner with Us</li><li>Careers</li><li>Press</li>
        </ul>
      </div>
      <div>
        <h4 className="text-primary-foreground/90 text-sm font-semibold uppercase tracking-wider mb-3">Support</h4>
        <ul className="space-y-2 text-primary-foreground/70 text-sm">
          <li>Help Center</li><li>Terms of Service</li><li>Privacy Policy</li>
        </ul>
      </div>
    </div>
    <div className="border-t border-primary-foreground/10 py-5 text-center text-primary-foreground/50 text-xs">
      © 2025 LuxeStay Hospitality. All rights reserved.
    </div>
  </footer>
);

export default Footer;
