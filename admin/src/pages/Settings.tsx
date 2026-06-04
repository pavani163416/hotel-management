import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Settings as SettingsIcon, Bell,
  Globe, Moon, Sun, Save, Check, Sliders
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import Topbar from "@/components/Topbar";
import { useAdmin } from "@/context/AdminContext";

type Language = "en" | "fr" | "es" | "de";

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme, language, setLanguage, t } = useAdmin();

  // Success indicators
  const [savedPreferences, setSavedPreferences] = useState(false);

  // Preference forms state
  const [notifBookings, setNotifBookings] = useState(() => {
    const saved = localStorage.getItem("luxe_pref_notif_bookings");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [notifPayments, setNotifPayments] = useState(() => {
    const saved = localStorage.getItem("luxe_pref_notif_payments");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [notifAlerts, setNotifAlerts] = useState(() => {
    const saved = localStorage.getItem("luxe_pref_notif_alerts");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [notifMarketing, setNotifMarketing] = useState(() => {
    const saved = localStorage.getItem("luxe_pref_notif_marketing");
    return saved !== null ? JSON.parse(saved) : false;
  });

  // Dashboard display preferences
  const [showQuickStats, setShowQuickStats] = useState(() => {
    const saved = localStorage.getItem("luxe_pref_show_quick_stats");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showRevenueGraphs, setShowRevenueGraphs] = useState(() => {
    const saved = localStorage.getItem("luxe_pref_show_revenue_graphs");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showLiveNotifications, setShowLiveNotifications] = useState(() => {
    const saved = localStorage.getItem("luxe_pref_show_live_notifications");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [defaultDateRange, setDefaultDateRange] = useState(() => {
    return localStorage.getItem("luxe_pref_default_date_range") || "30";
  });

  const handleSavePreferences = () => {
    localStorage.setItem("luxe_pref_notif_bookings", JSON.stringify(notifBookings));
    localStorage.setItem("luxe_pref_notif_payments", JSON.stringify(notifPayments));
    localStorage.setItem("luxe_pref_notif_alerts", JSON.stringify(notifAlerts));
    localStorage.setItem("luxe_pref_notif_marketing", JSON.stringify(notifMarketing));

    localStorage.setItem("luxe_pref_show_quick_stats", JSON.stringify(showQuickStats));
    localStorage.setItem("luxe_pref_show_revenue_graphs", JSON.stringify(showRevenueGraphs));
    localStorage.setItem("luxe_pref_show_live_notifications", JSON.stringify(showLiveNotifications));
    localStorage.setItem("luxe_pref_default_date_range", defaultDateRange);

    setSavedPreferences(true);
    setTimeout(() => setSavedPreferences(false), 3000);
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
      <div className="p-6 max-w-4xl">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted hover:text-text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> {t("Back")}
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary-light grid place-items-center">
            <SettingsIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">{t("Account Settings")}</h1>
            <p className="text-xs text-muted">{t("Customize your admin experience and manage preferences")}</p>
          </div>
        </div>

        <div className="space-y-6">
          {savedPreferences && (
            <div className="flex items-center gap-2 bg-success-light text-success text-sm font-medium px-4 py-2.5 rounded-lg">
              <Check className="w-4 h-4" /> {t("Preferences saved successfully")}
            </div>
          )}

          {/* Theme & Language */}
          <div className="bg-white rounded-xl border border-border shadow-card p-6">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" /> {t("Theme & Language")}
            </h3>
            <div className="space-y-6">
              <div>
                <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">{t("Theme")}</label>
                <div className="flex gap-2">
                  {([
                    { value: "dark", label: "Dark", icon: Moon },
                    { value: "light", label: "Light", icon: Sun },
                  ] as const).map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setTheme(value)}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                        theme === value
                          ? "bg-primary text-white border-primary"
                          : "border-border text-text-secondary hover:bg-surface-3"
                      }`}
                    >
                      <Icon className="w-4.5 h-4.5" /> {t(label)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">{t("Language")}</label>
                <div className="flex items-center gap-2 bg-surface-2 rounded-lg px-3 py-2.5 border border-border">
                  <Globe className="w-4 h-4 text-muted shrink-0" />
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as Language)}
                    className="bg-transparent text-sm outline-none flex-1 text-text-primary font-medium"
                  >
                    <option value="en">English</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="es">Spanish</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="bg-white rounded-xl border border-border shadow-card p-6">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" /> {t("Notifications Settings")}
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
                    <p className="text-sm font-medium text-text-primary">{t(label)}</p>
                    <p className="text-xs text-muted">{t(sub)}</p>
                  </div>
                  <Toggle checked={value} onChange={onChange} />
                </div>
              ))}
            </div>
          </div>

          {/* Dashboard Display Preferences */}
          <div className="bg-white rounded-xl border border-border shadow-card p-6">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" /> {t("Dashboard Display Preferences")}
            </h3>
            <div className="space-y-4">
              {[
                { label: "Show Quick Stats Summary", sub: "Toggle top dashboard statistic cards", value: showQuickStats, onChange: () => setShowQuickStats(!showQuickStats) },
                { label: "Show Revenue & Analytics Graphs", sub: "Toggle detailed charting widgets", value: showRevenueGraphs, onChange: () => setShowRevenueGraphs(!showRevenueGraphs) },
                { label: "Show Live Notification Alerts", sub: "Enable realtime sound/alert toast indicators", value: showLiveNotifications, onChange: () => setShowLiveNotifications(!showLiveNotifications) },
              ].map(({ label, sub, value, onChange }) => (
                <div key={label} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{t(label)}</p>
                    <p className="text-xs text-muted">{t(sub)}</p>
                  </div>
                  <Toggle checked={value} onChange={onChange} />
                </div>
              ))}
              <div className="pt-2">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">{t("Default Date Period")}</label>
                <select
                  value={defaultDateRange}
                  onChange={(e) => setDefaultDateRange(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary transition-colors text-text-primary font-medium"
                >
                  <option value="7">{t("Last 7 Days")}</option>
                  <option value="30">{t("Last 30 Days")}</option>
                  <option value="90">{t("Last 9 Months")}</option>
                  <option value="365">{t("Last 1 Year")}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Save preferences */}
          <div className="flex justify-end">
            <button
              onClick={handleSavePreferences}
              className="flex items-center gap-2 text-sm font-semibold bg-primary text-white rounded-lg px-6 py-2.5 hover:bg-primary-dark transition-colors"
            >
              <Save className="w-4 h-4" /> {t("Save Preferences")}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
