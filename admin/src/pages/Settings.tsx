import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Settings as SettingsIcon, Bell, Shield,
  Globe, Moon, Sun, Monitor, Save, Check, Eye, EyeOff,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import Topbar from "@/components/Topbar";
import { useAdmin } from "@/context/AdminContext";

type Theme = "dark" | "light" | "system";
type Language = "en" | "fr" | "es" | "de";

export default function Settings() {
  const navigate = useNavigate();
  const { admin } = useAdmin();

  const [saved, setSaved] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const [language, setLanguage] = useState<Language>("en");
  const [notifBookings, setNotifBookings] = useState(true);
  const [notifPayments, setNotifPayments] = useState(true);
  const [notifAlerts, setNotifAlerts] = useState(true);
  const [notifMarketing, setNotifMarketing] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`relative w-10 h-5.5 rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-surface-3"
      }`}
      style={{ width: 40, height: 22 }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? "translateX(18px)" : "translateX(0)" }}
      />
    </button>
  );

  return (
    <AdminLayout>
      <Topbar title="Settings" />
      <div className="p-6 max-w-2xl">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted hover:text-text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-primary-light grid place-items-center">
            <SettingsIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary">Settings</h1>
            <p className="text-xs text-muted">Customize your admin experience</p>
          </div>
        </div>

        {saved && (
          <div className="mb-4 flex items-center gap-2 bg-success-light text-success text-sm font-medium px-4 py-2.5 rounded-lg">
            <Check className="w-4 h-4" /> Settings saved successfully
          </div>
        )}

        {/* Appearance */}
        <div className="bg-white rounded-xl border border-border shadow-card p-6 mb-4">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
            <Sun className="w-4 h-4 text-primary" /> Appearance
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">Theme</label>
              <div className="flex gap-2">
                {([
                  { value: "dark", label: "Dark", icon: Moon },
                  { value: "light", label: "Light", icon: Sun },
                  { value: "system", label: "System", icon: Monitor },
                ] as const).map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      theme === value
                        ? "bg-primary text-white border-primary"
                        : "border-border text-text-secondary hover:bg-surface-3"
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">Language</label>
              <div className="flex items-center gap-2 bg-surface-2 rounded-lg px-3 py-2.5">
                <Globe className="w-4 h-4 text-muted shrink-0" />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="bg-transparent text-sm outline-none flex-1 text-text-primary"
                >
                  <option value="en">English</option>
                  <option value="fr">French</option>
                  <option value="es">Spanish</option>
                  <option value="de">German</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl border border-border shadow-card p-6 mb-4">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" /> Notification Preferences
          </h3>
          <div className="space-y-3">
            {[
              { label: "New Bookings", sub: "Get notified when a new booking is made", value: notifBookings, onChange: () => setNotifBookings(!notifBookings) },
              { label: "Payment Alerts", sub: "Receive notifications for payment activity", value: notifPayments, onChange: () => setNotifPayments(!notifPayments) },
              { label: "System Alerts", sub: "Critical system and maintenance alerts", value: notifAlerts, onChange: () => setNotifAlerts(!notifAlerts) },
              { label: "Marketing Updates", sub: "Updates about new features and promotions", value: notifMarketing, onChange: () => setNotifMarketing(!notifMarketing) },
            ].map(({ label, sub, value, onChange }) => (
              <div key={label} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-text-primary">{label}</p>
                  <p className="text-xs text-muted">{sub}</p>
                </div>
                <Toggle checked={value} onChange={onChange} />
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-xl border border-border shadow-card p-6 mb-4">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Security
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <p className="text-sm font-medium text-text-primary">Two-Factor Authentication</p>
                <p className="text-xs text-muted">Add an extra layer of security to your account</p>
              </div>
              <Toggle checked={twoFactor} onChange={() => setTwoFactor(!twoFactor)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">Session Timeout (minutes)</label>
              <select
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary transition-colors"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
                <option value="480">8 hours</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">API Key</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 border border-border rounded-lg px-3 py-2.5 bg-surface-2">
                  <code className="text-xs text-text-secondary flex-1 truncate font-mono">
                    {showApiKey ? `lxs_${admin?.email?.replace(/[^a-z0-9]/gi, "")}x8f3k2pqrt90` : "••••••••••••••••••••••••••••••••"}
                  </code>
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-muted hover:text-text-primary transition-colors"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted mt-1.5">Use this key for API integrations. Keep it secret.</p>
            </div>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className="flex items-center gap-2 text-sm font-semibold bg-primary text-white rounded-lg px-6 py-2.5 hover:bg-primary-dark transition-colors"
        >
          <Save className="w-4 h-4" /> Save Settings
        </button>
      </div>
    </AdminLayout>
  );
}
