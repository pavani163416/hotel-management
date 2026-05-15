import { useState, useEffect } from "react";
import { Search, X, Monitor, Smartphone, Tablet, Globe, TrendingUp, Users, UserCheck, UserX, Building2, Clock, Eye, MousePointerClick } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import Topbar from "@/components/Topbar";
import PageHeader from "@/components/PageHeader";
import StatsCard from "@/components/StatsCard";
import Modal from "@/components/Modal";
import { useHotels } from "@/context/HotelsContext";
import { useBookings } from "@/context/BookingsContext";
import { Visitor } from "@/context/VisitorContext";
import { useAdmin } from "@/context/AdminContext";
import socket from "@/services/socket";

interface ManagerInsight {
  _id: string;
  name: string;
  email: string;
  hotelId?: string;
  hotelName?: string;
  lastLogin?: string;
  isActive: boolean;
}

interface HotelManagerMap {
  hotelId: string;
  hotelName: string;
  managers: {
    _id: string;
    name: string;
    email: string;
    isActive: boolean;
    lastLogin?: string;
  }[];
  managerCount: number;
  activeCount: number;
}

const deviceIcon: Record<Visitor["device"], JSX.Element> = {
  Desktop: <Monitor className="w-4 h-4" />,
  Mobile:  <Smartphone className="w-4 h-4" />,
  Tablet:  <Tablet className="w-4 h-4" />,
};

const statusStyle: Record<string, string> = {
  Active:    "bg-success-light text-success",
  Bounced:   "bg-danger-light text-danger",
  Converted: "bg-primary-light text-primary",
};

const flagUrl = (code: string) =>
  `https://flagcdn.com/20x15/${code.toLowerCase()}.png`;

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function fmtDuration(s: number) {
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default function Insights() {
  const { hotels } = useHotels();
  const { bookings } = useBookings();
  const { token } = useAdmin();

  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loadingVisitors, setLoadingVisitors] = useState(true);
  
  // Manager insights state
  const [managerInsights, setManagerInsights] = useState<any>(null);
  const [hotelManagerMap, setHotelManagerMap] = useState<any>(null);
  const [loadingInsights, setLoadingInsights] = useState(true);

  const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  // ── Fetch real visitors from HTTP first, then layer Socket.IO updates ──
  useEffect(() => {
    fetch(`${API}/visitors`)
      .then((r) => r.json())
      .then((data) => {
        const raw: any[] = Array.isArray(data?.data) ? data.data : [];
        setVisitors(raw.map((v) => mapVisitor(v)));
      })
      .catch(() => {})
      .finally(() => setLoadingVisitors(false));
  }, []);

  // ── Socket.IO for real-time visitor updates ──
  useEffect(() => {
    const handleVisitorsList = (data: any[]) => {
      const mapped: Visitor[] = data.map((v: any) => mapVisitor(v));
      if (mapped.length) setVisitors(mapped);
      setLoadingVisitors(false);
    };

    const handleVisitorUpdate = (data: any) => {
      const updated = mapVisitor(data);
      setVisitors((prev) => {
        const idx = prev.findIndex((v) => v.id === updated.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        return [updated, ...prev];
      });
    };

    socket.on("visitors_list", handleVisitorsList);
    socket.on("visitor_update", handleVisitorUpdate);

    return () => {
      socket.off("visitors_list", handleVisitorsList);
      socket.off("visitor_update", handleVisitorUpdate);
    };
  }, []);

  // ── Fetch Manager Insights ──
  useEffect(() => {
    const fetchManagerInsights = async () => {
      try {
        const [insightsRes, mapRes] = await Promise.all([
          fetch(`${API}/admin/manager-insights`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API}/admin/hotel-manager-map`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        
        const insightsData = await insightsRes.json();
        const mapData = await mapRes.json();
        
        if (insightsData.success) {
          setManagerInsights(insightsData.data);
        }
        if (mapData.success) {
          setHotelManagerMap(mapData.data);
        }
      } catch (e) {
        console.error("Failed to fetch manager insights:", e);
      } finally {
        setLoadingInsights(false);
      }
    };

    if (token) {
      fetchManagerInsights();
    }
  }, [token]);

  function mapVisitor(v: any): Visitor {    return {
      id:          v._id || v.id,
      ip:          v.ip,
      country:     v.country || "Unknown",
      countryCode: v.countryCode || "XX",
      city:        v.city || "Unknown",
      device:      v.device || "Desktop",
      browser:     v.browser || "Unknown",
      os:          v.os || "Unknown",
      page:        v.page || "/",
      referrer:    v.referrer || "direct",
      duration:    v.duration || 0,
      visitedAt:   v.createdAt || new Date().toISOString(),
      status:      v.status || "Active",
    };
  }

  const [visitorSearch, setVisitorSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [detail, setDetail] = useState<Visitor | null>(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  // ── Hotel popularity: rank by bookings count from BookingsContext ──
  const hotelStats = hotels.map((h) => {
    const hBookings = bookings.filter((b) => b.property === h.name);
    const revenue   = hBookings.reduce((s, b) => s + b.totalAmount, 0);
    // visitor page views for this hotel
    const views = visitors.filter((v) =>
      v.page.includes(String(h.id)) || v.page.includes(h.name.toLowerCase().replace(/\s+/g, "-"))
    ).length;
    return { ...h, bookingCount: hBookings.length, revenue, views };
  }).sort((a, b) => b.bookingCount - a.bookingCount || b.ytdRevenue - a.ytdRevenue);

  const maxBookings = Math.max(...hotelStats.map((h) => h.bookingCount), 1);

  // ── Visitor stats ──
  const active    = visitors.filter((v) => v.status === "Active").length;
  const converted = visitors.filter((v) => v.status === "Converted").length;
  const bounced   = visitors.filter((v) => v.status === "Bounced").length;
  const avgDur    = Math.round(visitors.reduce((s, v) => s + v.duration, 0) / (visitors.length || 1));

  // ── Filtered visitors ──
  const filteredVisitors = visitors.filter((v) => {
    const q = visitorSearch.toLowerCase();
    const match = !q || v.ip.includes(q) || v.country.toLowerCase().includes(q) ||
      v.city.toLowerCase().includes(q) || v.page.toLowerCase().includes(q);
    const matchStatus = statusFilter === "All" || v.status === statusFilter;
    return match && matchStatus;
  });

  const paginated = filteredVisitors.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(filteredVisitors.length / PER_PAGE));

  return (
    <AdminLayout>
      <Topbar title="Insights" />
      <div className="p-6 space-y-6">
        <PageHeader
          title="Insights & Visitor Tracking"
          subtitle="Hotel popularity rankings and real-time visitor activity from the guest portal."
        />

        {/* ══ SECTION 1: Hotel Popularity ══ */}
        <div>
          <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Hotel Popularity Ranking
          </h2>
          <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  {["Rank", "Hotel", "Location", "Bookings", "Revenue", "Page Views", "Status"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hotelStats.map((h, i) => (
                  <tr key={h.id} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                    {/* Rank */}
                    <td className="px-5 py-4">
                      <div className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold ${
                        i === 0 ? "bg-warning text-white" :
                        i === 1 ? "bg-surface-3 text-text-secondary" :
                        i === 2 ? "bg-warning-light text-warning" :
                        "bg-surface-3 text-muted"
                      }`}>
                        {i + 1}
                      </div>
                    </td>

                    {/* Hotel */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <img src={h.img} alt={h.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{h.name}</p>
                          <p className="text-xs text-muted">{h.subtitle}</p>
                        </div>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="px-5 py-4 text-sm text-text-secondary">
                      {h.location}, {h.country}
                    </td>

                    {/* Bookings bar */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full"
                            style={{ width: `${(h.bookingCount / maxBookings) * 100}%` }} />
                        </div>
                        <span className="text-sm font-semibold text-text-primary">{h.bookingCount}</span>
                      </div>
                    </td>

                    {/* Revenue */}
                    <td className="px-5 py-4 text-sm font-semibold text-text-primary">
                      ${(h.ytdRevenue / 1000).toFixed(0)}k
                    </td>

                    {/* Page Views */}
                    <td className="px-5 py-4 text-sm text-text-secondary">
                      {h.views + h.activeBookings} views
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        h.status === "Active" ? "bg-success-light text-success" :
                        h.status === "Maintenance" ? "bg-warning-light text-warning" :
                        "bg-surface-3 text-muted"
                      }`}>
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ══ SECTION 2: Visitor Stats ══ */}
        <div>
          <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" /> Guest Portal Visitor Tracking
          </h2>

          {/* Visitor stats cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <StatsCard title="Total Visitors" value={visitors.length} change="Last 24 hours" trend="up"
              icon={<Users className="w-5 h-5 text-primary" />} iconBg="bg-primary-light" />
            <StatsCard title="Active Now" value={active} change="On site" trend="up"
              icon={<Eye className="w-5 h-5 text-success" />} iconBg="bg-success-light" />
            <StatsCard title="Converted" value={converted} change="Made a booking" trend="up"
              icon={<MousePointerClick className="w-5 h-5 text-warning" />} iconBg="bg-warning-light" />
            <StatsCard title="Avg Session" value={fmtDuration(avgDur)} change="Time on site"
              icon={<Clock className="w-5 h-5 text-text-secondary" />} iconBg="bg-surface-3" />
          </div>

          {/* Visitor table */}
          <div className="bg-white rounded-xl border border-border shadow-card">
            {/* Filters */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-wrap">
              <div className="flex items-center gap-2 bg-surface-3 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-muted shrink-0" />
                <input value={visitorSearch} onChange={(e) => { setVisitorSearch(e.target.value); setPage(1); }}
                  placeholder="Search by IP, country, city or page..."
                  className="bg-transparent text-sm outline-none w-full placeholder:text-muted" />
                {visitorSearch && <button onClick={() => setVisitorSearch("")}><X className="w-3.5 h-3.5 text-muted" /></button>}
              </div>
              {["All", "Active", "Converted", "Bounced"].map((s) => (
                <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                    statusFilter === s ? "bg-primary text-white" : "bg-surface-3 text-muted hover:bg-surface-2"
                  }`}>
                  {s}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["IP Address", "Location", "Device & Browser", "Page Visited", "Referrer", "Duration", "Status", "Time", "Details"].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr><td colSpan={9} className="px-5 py-12 text-center text-muted text-sm">
                      {loadingVisitors
                        ? "Loading visitors..."
                        : visitors.length === 0
                          ? "No visitor data yet. Visitors are tracked when guests browse the user portal (localhost:3000)."
                          : "No visitors match your search."}
                    </td></tr>
                  ) : paginated.map((v) => (
                    <tr key={v.id} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                      {/* IP */}
                      <td className="px-4 py-3">
                        <p className="text-sm font-mono font-semibold text-text-primary">{v.ip}</p>
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <img src={flagUrl(v.countryCode)} alt={v.country}
                            className="w-5 h-3.5 rounded-sm object-cover shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          <div>
                            <p className="text-sm text-text-primary">{v.city}</p>
                            <p className="text-xs text-muted">{v.country}</p>
                          </div>
                        </div>
                      </td>

                      {/* Device */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-sm text-text-secondary">
                          <span className="text-muted">{deviceIcon[v.device]}</span>
                          <div>
                            <p className="text-sm text-text-primary">{v.device}</p>
                            <p className="text-xs text-muted">{v.browser} · {v.os}</p>
                          </div>
                        </div>
                      </td>

                      {/* Page */}
                      <td className="px-4 py-3">
                        <p className="text-sm font-mono text-text-secondary">{v.page}</p>
                      </td>

                      {/* Referrer */}
                      <td className="px-4 py-3">
                        <p className="text-xs text-muted">{v.referrer}</p>
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-3">
                        <p className="text-sm text-text-secondary">{fmtDuration(v.duration)}</p>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyle[v.status]}`}>
                          {v.status}
                        </span>
                      </td>

                      {/* Time */}
                      <td className="px-4 py-3">
                        <p className="text-xs text-muted">{timeAgo(v.visitedAt)}</p>
                      </td>

                      {/* Details */}
                      <td className="px-4 py-3">
                        <button onClick={() => setDetail(v)}
                          className="text-xs font-semibold text-primary hover:underline">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-border">
              <p className="text-xs text-muted">
                Showing {filteredVisitors.length === 0 ? 0 : (page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filteredVisitors.length)} of {filteredVisitors.length} visitors
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                  className="px-3 py-1.5 text-xs border border-border rounded-lg text-muted hover:bg-surface-3 disabled:opacity-40">
                  Previous
                </button>
                {[...Array(Math.min(totalPages, 5))].map((_, i) => (
                  <button key={i} onClick={() => setPage(i + 1)}
                    className={`px-3 py-1.5 text-xs rounded-lg ${page === i + 1 ? "bg-primary text-white" : "border border-border text-muted hover:bg-surface-3"}`}>
                    {i + 1}
                  </button>
                ))}
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs border border-border rounded-lg text-muted hover:bg-surface-3 disabled:opacity-40">
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visitor Detail Modal */}
      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title="Visitor Details">
        {detail && (
          <div className="space-y-4">
            <div className="bg-surface-2 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-light grid place-items-center">
                  <Globe className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-mono font-bold text-text-primary">{detail.ip}</p>
                  <p className="text-xs text-muted">{detail.city}, {detail.country}</p>
                </div>
              </div>
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${statusStyle[detail.status]}`}>
                {detail.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                ["Country",      detail.country],
                ["City",         detail.city],
                ["Device",       detail.device],
                ["Browser",      detail.browser],
                ["OS",           detail.os],
                ["Page Visited", detail.page],
                ["Referrer",     detail.referrer],
                ["Time on Site", fmtDuration(detail.duration)],
                ["Visited At",   new Date(detail.visitedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })],
                ["Status",       detail.status],
              ].map(([label, value]) => (
                <div key={label} className="bg-surface-2 rounded-lg p-3">
                  <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-0.5">{label}</p>
                  <p className="text-sm font-medium text-text-primary break-all">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* ══ SECTION 3: Manager Insights ══ */}
      <div>
        <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-primary" /> Manager Activity & Assignments
        </h2>

        {/* Manager Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatsCard 
            title="Total Managers" 
            value={managerInsights?.totalManagers || 0} 
            change="Registered"
            icon={<Users className="w-5 h-5 text-primary" />} 
            iconBg="bg-primary-light" 
          />
          <StatsCard 
            title="Active Managers" 
            value={managerInsights?.activeManagers || 0} 
            change="Can login"
            trend="up"
            icon={<UserCheck className="w-5 h-5 text-success" />} 
            iconBg="bg-success-light" 
          />
          <StatsCard 
            title="Inactive Managers" 
            value={managerInsights?.inactiveManagers || 0} 
            change="Access disabled"
            trend="down"
            icon={<UserX className="w-5 h-5 text-danger" />} 
            iconBg="bg-danger-light" 
          />
          <StatsCard 
            title="Hotels with Managers" 
            value={managerInsights?.managersPerHotel?.filter((h: any) => h.hotelId !== 'unassigned').length || 0} 
            change="Assigned"
            icon={<Building2 className="w-5 h-5 text-warning" />} 
            iconBg="bg-warning-light" 
          />
        </div>

        {/* Manager Activity & Hotel Mapping */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recently Active Managers */}
          <div className="bg-white rounded-xl border border-border shadow-card">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Recently Active Managers
              </h3>
            </div>
            <div className="p-4">
              {loadingInsights ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : managerInsights?.recentlyActive?.length === 0 ? (
                <p className="text-sm text-muted text-center py-4">No recent manager activity</p>
              ) : (
                <div className="space-y-3">
                  {managerInsights?.recentlyActive?.slice(0, 5).map((manager: ManagerInsight) => (
                    <div key={manager._id} className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          manager.isActive ? 'bg-success-light' : 'bg-surface-3'
                        }`}>
                          <span className={`text-sm font-semibold ${manager.isActive ? 'text-success' : 'text-muted'}`}>
                            {manager.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{manager.name}</p>
                          <p className="text-xs text-muted">{manager.hotelName || 'Unassigned'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted">{manager.lastLogin ? timeAgo(manager.lastLogin) : 'Never'}</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          manager.isActive ? 'bg-success-light text-success' : 'bg-surface-3 text-muted'
                        }`}>
                          {manager.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Hotel Manager Mapping */}
          <div className="bg-white rounded-xl border border-border shadow-card">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Building2 className="w-4 h-4 text-warning" /> Hotel Manager Mapping
              </h3>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              {loadingInsights ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : hotelManagerMap?.hotels?.length === 0 ? (
                <p className="text-sm text-muted text-center py-4">No hotels found</p>
              ) : (
                <div className="space-y-3">
                  {hotelManagerMap?.hotels?.map((hotel: HotelManagerMap) => (
                    <div key={hotel.hotelId} className="p-3 bg-surface-2 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-text-primary">{hotel.hotelName}</p>
                        <span className="text-xs text-muted">
                          {hotel.activeCount}/{hotel.managerCount} active
                        </span>
                      </div>
                      {hotel.managers.length === 0 ? (
                        <p className="text-xs text-muted italic">No managers assigned</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {hotel.managers.map((m) => (
                            <span key={m._id} className={`text-xs px-2 py-1 rounded-full ${
                              m.isActive 
                                ? 'bg-success-light text-success' 
                                : 'bg-danger-light text-danger'
                            }`}>
                              {m.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {hotelManagerMap?.unassigned?.length > 0 && (
                    <div className="p-3 bg-surface-2 rounded-lg border border-dashed border-warning/30">
                      <p className="text-sm font-semibold text-text-primary mb-2">Unassigned Managers</p>
                      <div className="flex flex-wrap gap-2">
                        {hotelManagerMap.unassigned.map((m: any) => (
                          <span key={m._id} className={`text-xs px-2 py-1 rounded-full ${
                            m.isActive 
                              ? 'bg-success-light text-success' 
                              : 'bg-surface-3 text-muted'
                          }`}>
                            {m.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Managers Per Hotel Chart */}
        {managerInsights?.managersPerHotel && managerInsights.managersPerHotel.length > 0 && (
          <div className="mt-4 bg-white rounded-xl border border-border shadow-card p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Managers per Hotel
            </h3>
            <div className="flex items-end gap-2 h-40">
              {managerInsights.managersPerHotel
                .filter((h: any) => h.hotelId !== 'unassigned')
                .map((hotel: any) => {
                  const maxCount = Math.max(...managerInsights.managersPerHotel.filter((h: any) => h.hotelId !== 'unassigned').map((h: any) => h.count), 1);
                  const height = (hotel.count / maxCount) * 100;
                  return (
                    <div key={hotel.hotelId} className="flex-1 flex flex-col items-center gap-2">
                      <div 
                        className="w-full bg-primary/80 hover:bg-primary rounded-t transition-all"
                        style={{ height: `${Math.max(height, 4)}%` }}
                        title={`${hotel.count} manager(s)`}
                      />
                      <span className="text-xs text-muted truncate w-full text-center">{hotel.hotelName}</span>
                      <span className="text-xs font-semibold text-text-primary">{hotel.count}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
