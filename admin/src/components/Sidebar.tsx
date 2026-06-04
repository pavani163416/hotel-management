import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Hotel, BedDouble, CalendarCheck,
  Users, BarChart3, Building2, DollarSign, CreditCard, Lightbulb, ArrowLeft, UserCog, Tag, Flame, Map, BadgeDollarSign, LifeBuoy, Bell
} from "lucide-react";
import { useAdmin } from "@/context/AdminContext";

const links = [
  { to: "/dashboard",     icon: LayoutDashboard, label: "Dashboard" },
  { to: "/hotels",        icon: Hotel,           label: "Hotels" },
  { to: "/rooms",         icon: BedDouble,       label: "Rooms" },
  { to: "/hotel-map",     icon: Map,             label: "Hotel Map" },
  { to: "/bookings",      icon: CalendarCheck,   label: "Bookings" },
  { to: "/payments",      icon: CreditCard,      label: "Payments" },
  { to: "/guests",        icon: Users,           label: "Guests" },
  { to: "/revenue",       icon: DollarSign,      label: "Revenue" },
  { to: "/analytics",     icon: BarChart3,       label: "Analytics" },
  { to: "/insights",      icon: Lightbulb,       label: "Insights" },
  { to: "/managers",      icon: UserCog,         label: "Managers" },
  { to: "/coupons",       icon: Tag,             label: "Coupons & Offers" },
  { to: "/top-deals",    icon: Flame,           label: "Top Deals" },
  { to: "/notifications", icon: Bell,            label: "Notifications" },
];

const topLevel = new Set(["/dashboard", "/hotels", "/rooms", "/hotel-map", "/bookings", "/payments", "/guests", "/revenue", "/analytics", "/insights", "/managers", "/coupons", "/top-deals", "/notifications"]);

export default function Sidebar() {
  const { admin, theme, t } = useAdmin();
  const navigate  = useNavigate();
  const location  = useLocation();

  const showBack = !topLevel.has(location.pathname);
  const initials = (admin?.name || "A").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-56 flex flex-col z-30"
      style={{
        background: theme === "light" ? "linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)" : "linear-gradient(180deg, #07101e 0%, #0a1628 100%)",
        borderRight: theme === "light" ? "1px solid #cbd5e1" : "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5"
        style={{ borderBottom: theme === "light" ? "1px solid #cbd5e1" : "1px solid rgba(255,255,255,0.07)" }}>
        <div className="w-8 h-8 rounded-lg grid place-items-center shrink-0"
          style={{
            background: "linear-gradient(135deg, rgba(212,168,67,0.2) 0%, rgba(212,168,67,0.08) 100%)",
            border: "1px solid rgba(212,168,67,0.3)",
          }}>
          <Building2 className="w-4 h-4 text-gold" />
        </div>
        <div>
          <p className="text-bright font-bold text-sm leading-none">LuxeStay</p>
          <p className="text-dim text-[10px] mt-0.5">{t("Management")}</p>
        </div>
      </div>

      {/* Back button */}
      {showBack && (
        <div className="px-3 pt-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-dim transition-all"
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = theme === "light" ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.06)";
              (e.currentTarget as HTMLElement).style.color = theme === "light" ? "#0f172a" : "#f0f4ff";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "#64748b";
            }}
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            {t("Go Back")}
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive ? "active-nav-link" : "inactive-nav-link"
              }`
            }
            style={({ isActive }) => isActive
              ? {
                  background: theme === "light"
                    ? "linear-gradient(135deg, rgba(192,57,43,0.1) 0%, rgba(192,57,43,0.04) 100%)"
                    : "linear-gradient(135deg, rgba(192,57,43,0.2) 0%, rgba(192,57,43,0.08) 100%)",
                  color: theme === "light" ? "#c0392b" : "#f0f4ff",
                  borderLeft: "2px solid #c0392b",
                  paddingLeft: "10px",
                }
              : {
                  color: theme === "light" ? "#475569" : "#64748b",
                  borderLeft: "2px solid transparent",
                  paddingLeft: "10px",
                }
            }
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              if (!el.classList.contains("active-nav-link")) {
                el.style.background = theme === "light" ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.05)";
                el.style.color = theme === "light" ? "#0f172a" : "#94a3b8";
              }
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              if (!el.classList.contains("active-nav-link")) {
                el.style.background = "transparent";
                el.style.color = theme === "light" ? "#475569" : "#64748b";
              }
            }}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {t(label)}
          </NavLink>
        ))}
      </nav>

      {/* Admin profile */}
      <div className="px-3 py-4" style={{ borderTop: theme === "light" ? "1px solid #cbd5e1" : "1px solid rgba(255,255,255,0.07)" }}>
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-3 px-3 py-2 rounded-lg w-full text-left transition-all"
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = theme === "light" ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.06)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
        >
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(212,168,67,0.2) 0%, rgba(212,168,67,0.08) 100%)",
              border: "1px solid rgba(212,168,67,0.3)",
            }}>
            {admin?.profileImage ? (
              <img src={admin.profileImage} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-gold text-xs font-bold w-full h-full grid place-items-center">{initials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-bright text-xs font-semibold truncate">{admin?.name || "Admin"}</p>
            <p className="text-dim text-[10px] truncate">{admin?.role || "Super Admin"}</p>
          </div>
        </button>
      </div>
    </aside>
  );
}
