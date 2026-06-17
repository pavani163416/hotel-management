import { useState, useEffect } from "react";
import { Cookie, X, ChevronDown, ChevronUp, Shield } from "lucide-react";

const STORAGE_KEY = "athithigriha_cookie_consent";

interface Preferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

const DEFAULT_PREFS: Preferences = { essential: true, analytics: false, marketing: false };

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      // Delay slightly so the page renders first
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const save = (p: Preferences) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    setVisible(false);
  };

  const acceptAll = () => save({ essential: true, analytics: true, marketing: true });
  const rejectAll = () => save({ essential: true, analytics: false, marketing: false });
  const savePrefs = () => save(prefs);

  const toggle = (key: keyof Preferences) => {
    if (key === "essential") return; // essential always on
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-in slide-in-from-bottom-4 duration-500"
      role="dialog"
      aria-label="Cookie consent"
      id="cookie-consent-banner"
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50 bg-primary/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Cookie className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-foreground text-sm">Cookie Preferences</span>
          </div>
          <button
            onClick={rejectAll}
            aria-label="Reject all and close"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          <p className="text-muted-foreground text-sm leading-relaxed mb-4">
            We use cookies to enhance your browsing experience, analyze site traffic, and personalize content.
            You can manage your preferences below or accept all cookies for the best experience.
          </p>

          {/* Expandable Preferences */}
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="flex items-center gap-1.5 text-sm text-primary font-semibold mb-3 hover:underline"
            id="cookie-preferences-toggle"
          >
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showDetails ? "Hide preferences" : "Customize preferences"}
          </button>

          {showDetails && (
            <div className="space-y-3 mb-4">
              {([
                { key: "essential", label: "Essential", description: "Required for core site functionality. Cannot be disabled.", locked: true },
                { key: "analytics", label: "Analytics", description: "Help us understand how visitors use AthithiGriha.", locked: false },
                { key: "marketing", label: "Marketing", description: "Enable personalized offers and targeted advertising.", locked: false },
              ] as const).map(({ key, label, description, locked }) => (
                <div key={key} className="flex items-start justify-between gap-3 p-3 bg-secondary/30 rounded-xl">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm font-semibold text-foreground">{label}</span>
                      {locked && <Shield className="w-3 h-3 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={prefs[key]}
                    onClick={() => toggle(key)}
                    disabled={locked}
                    id={`cookie-toggle-${key}`}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors mt-0.5 ${
                      prefs[key] ? "bg-primary" : "bg-muted"
                    } ${locked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${prefs[key] ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2">
            {showDetails ? (
              <button
                onClick={savePrefs}
                id="cookie-save-preferences"
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Save Preferences
              </button>
            ) : (
              <>
                <button
                  onClick={rejectAll}
                  id="cookie-reject-all"
                  className="flex-1 py-2.5 border border-border text-foreground rounded-xl text-sm font-semibold hover:bg-secondary/50 transition-colors"
                >
                  Reject All
                </button>
                <button
                  onClick={acceptAll}
                  id="cookie-accept-all"
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  Accept All
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
