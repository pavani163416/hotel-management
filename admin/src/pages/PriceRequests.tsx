import { useState, useEffect, useCallback } from "react";
import {
  Search, X, CheckCircle, XCircle, Clock,
  DollarSign, TrendingUp, TrendingDown, ChevronDown,
  RefreshCw, MessageSquare,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import Topbar from "@/components/Topbar";
import PageHeader from "@/components/PageHeader";
import StatsCard from "@/components/StatsCard";
import StatusBadge from "@/components/StatusBadge";
import Modal from "@/components/Modal";
import {
  getAdminPriceRequests,
  approvePriceRequest,
  rejectPriceRequest,
  getHotels,
} from "@/services/api";

interface PriceRequest {
  _id: string;
  hotelStringId: string | null;
  hotelName: string | null;
  roomId: { _id: string; roomNumber: string; type: string; pricePerNight: number } | null;
  roomNumber: string;
  createdBy: { _id: string; name: string; email: string } | null;
  createdByName: string;
  currentPrice: number;
  requestedPrice: number;
  reason: string;
  effectiveDate: string | null;
  status: "pending" | "approved" | "rejected";
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
}

interface Hotel { _id: string; hotelId: string; name: string; city: string; }

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const STATUS_COLORS: Record<string, string> = {
  pending:  "bg-warning-light text-warning",
  approved: "bg-success-light text-success",
  rejected: "bg-danger-light text-danger",
};

export default function PriceRequests() {
  const [requests, setRequests]   = useState<PriceRequest[]>([]);
  const [hotels, setHotels]       = useState<Hotel[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Filters
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "pending" | "approved" | "rejected">("");
  const [hotelFilter, setHotelFilter]   = useState("");

  // Review modal
  const [reviewTarget, setReviewTarget] = useState<{ req: PriceRequest; action: "approve" | "reject" } | null>(null);
  const [reviewNote, setReviewNote]     = useState("");
  const [reviewing, setReviewing]       = useState(false);
  const [reviewError, setReviewError]   = useState<string | null>(null);

  // ── Fetch ─────────────────────────────────────────────
  const fetchRequests = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = {};
      if (statusFilter) params.status        = statusFilter;
      if (hotelFilter)  params.hotelStringId = hotelFilter;
      const res: any = await getAdminPriceRequests(params);
      setRequests(res?.data || []);
    } catch (e: any) {
      setError(e.message || "Failed to load price requests.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, hotelFilter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  useEffect(() => {
    getHotels().then((r: any) => setHotels(r?.data || [])).catch(() => {});
  }, []);

  // ── Client-side search filter ─────────────────────────
  const filtered = requests.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.roomNumber || "").toLowerCase().includes(q) ||
      (r.hotelName  || "").toLowerCase().includes(q) ||
      (r.createdByName || "").toLowerCase().includes(q) ||
      (r.reason || "").toLowerCase().includes(q)
    );
  });

  // ── Stats ─────────────────────────────────────────────
  const pending  = requests.filter((r) => r.status === "pending").length;
  const approved = requests.filter((r) => r.status === "approved").length;
  const rejected = requests.filter((r) => r.status === "rejected").length;

  // ── Review submit ─────────────────────────────────────
  const handleReview = async () => {
    if (!reviewTarget) return;
    setReviewing(true);
    setReviewError(null);
    try {
      if (reviewTarget.action === "approve") {
        await approvePriceRequest(reviewTarget.req._id, reviewNote);
      } else {
        await rejectPriceRequest(reviewTarget.req._id, reviewNote);
      }
      setReviewTarget(null);
      setReviewNote("");
      fetchRequests(true);
    } catch (e: any) {
      setReviewError(e.message || "Action failed.");
    } finally {
      setReviewing(false);
    }
  };

  const priceDiff = (req: PriceRequest) => req.requestedPrice - req.currentPrice;
  const pricePct  = (req: PriceRequest) =>
    req.currentPrice ? ((priceDiff(req) / req.currentPrice) * 100).toFixed(1) : "0";

  return (
    <AdminLayout>
      <Topbar title="Price Requests" />
      <div className="p-6 space-y-6">
        <PageHeader
          title="Price Change Requests"
          subtitle="Review and approve or reject room price change requests from hotel managers."
          actions={
            <button
              onClick={() => fetchRequests(true)}
              disabled={refreshing}
              className="flex items-center gap-2 text-sm font-medium text-text-secondary border border-border rounded-lg px-4 py-2 hover:bg-surface-3 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          }
        />

        {/* ── Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatsCard
            title="Pending Review"
            value={pending}
            change="Awaiting action"
            icon={<Clock className="w-5 h-5 text-warning" />}
            iconBg="bg-warning-light"
          />
          <StatsCard
            title="Approved"
            value={approved}
            change="Price updated"
            trend="up"
            icon={<CheckCircle className="w-5 h-5 text-success" />}
            iconBg="bg-success-light"
          />
          <StatsCard
            title="Rejected"
            value={rejected}
            change="Declined"
            icon={<XCircle className="w-5 h-5 text-danger" />}
            iconBg="bg-danger-light"
          />
        </div>

        {/* ── Table ── */}
        <div className="bg-white rounded-xl border border-border shadow-card">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-border">
            {/* Search */}
            <div className="flex items-center gap-2 bg-surface-3 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-muted shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search room, hotel, manager..."
                className="bg-transparent text-sm outline-none w-full placeholder:text-muted"
              />
              {search && (
                <button onClick={() => setSearch("")}>
                  <X className="w-3.5 h-3.5 text-muted" />
                </button>
              )}
            </div>

            {/* Status pills */}
            <div className="flex gap-1.5">
              {(["", "pending", "approved", "rejected"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors capitalize ${
                    statusFilter === s
                      ? "bg-primary text-white"
                      : "bg-surface-3 text-muted hover:bg-surface-2"
                  }`}
                >
                  {s === "" ? "All" : s}
                  {s === "pending" && pending > 0 && (
                    <span className="ml-1.5 bg-warning text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {pending}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Hotel filter */}
            <div className="relative">
              <select
                value={hotelFilter}
                onChange={(e) => setHotelFilter(e.target.value)}
                className="appearance-none bg-surface-3 border border-border rounded-lg px-3 py-2 text-sm text-text-secondary outline-none pr-7 cursor-pointer"
              >
                <option value="">All Hotels</option>
                {hotels.map((h) => (
                  <option key={h._id} value={h.hotelId}>{h.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  {["Room", "Hotel", "Manager", "Current Price", "Requested", "Change", "Reason", "Status", "Date", "Actions"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-5 py-12 text-center text-muted text-sm">
                      Loading price requests...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={10} className="px-5 py-12 text-center text-danger text-sm">{error}</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-5 py-12 text-center text-muted text-sm">
                      No price requests found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((req) => {
                    const diff = priceDiff(req);
                    const pct  = pricePct(req);
                    const isUp = diff >= 0;
                    return (
                      <tr key={req._id} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                        {/* Room */}
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-semibold text-text-primary">#{req.roomNumber}</p>
                          <p className="text-xs text-muted">{req.roomId?.type || "—"}</p>
                        </td>

                        {/* Hotel */}
                        <td className="px-4 py-3.5">
                          <p className="text-sm text-text-secondary">{req.hotelName || "—"}</p>
                        </td>

                        {/* Manager */}
                        <td className="px-4 py-3.5">
                          <p className="text-sm text-text-secondary">{req.createdByName || req.createdBy?.name || "—"}</p>
                          <p className="text-xs text-muted">{req.createdBy?.email || ""}</p>
                        </td>

                        {/* Current Price */}
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-semibold text-text-primary">${req.currentPrice.toLocaleString()}</p>
                        </td>

                        {/* Requested */}
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-bold text-text-primary">${req.requestedPrice.toLocaleString()}</p>
                        </td>

                        {/* Change */}
                        <td className="px-4 py-3.5">
                          <div className={`flex items-center gap-1 text-xs font-bold ${isUp ? "text-success" : "text-danger"}`}>
                            {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                            {isUp ? "+" : ""}{pct}%
                          </div>
                          <p className={`text-xs ${isUp ? "text-success" : "text-danger"}`}>
                            {isUp ? "+" : ""}${diff.toLocaleString()}
                          </p>
                        </td>

                        {/* Reason */}
                        <td className="px-4 py-3.5 max-w-[160px]">
                          <p className="text-xs text-text-secondary truncate" title={req.reason}>
                            {req.reason || "—"}
                          </p>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[req.status]}`}>
                            {req.status}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3.5">
                          <p className="text-xs text-text-secondary">{timeAgo(req.createdAt)}</p>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5">
                          {req.status === "pending" ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => { setReviewTarget({ req, action: "approve" }); setReviewNote(""); setReviewError(null); }}
                                className="flex items-center gap-1 text-xs font-semibold text-success bg-success-light px-2.5 py-1.5 rounded-lg hover:bg-success hover:text-white transition-colors"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button
                                onClick={() => { setReviewTarget({ req, action: "reject" }); setReviewNote(""); setReviewError(null); }}
                                className="flex items-center gap-1 text-xs font-semibold text-danger bg-danger-light px-2.5 py-1.5 rounded-lg hover:bg-danger hover:text-white transition-colors"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Reject
                              </button>
                            </div>
                          ) : (
                            <div className="text-xs text-muted">
                              {req.reviewedAt ? timeAgo(req.reviewedAt) : "—"}
                              {req.reviewNote && (
                                <p className="text-muted italic truncate max-w-[100px]" title={req.reviewNote}>
                                  "{req.reviewNote}"
                                </p>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!loading && !error && filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-border">
              <p className="text-xs text-muted">
                Showing {filtered.length} of {requests.length} request{requests.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Review Modal ── */}
      <Modal
        isOpen={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        title={reviewTarget?.action === "approve" ? "Approve Price Request" : "Reject Price Request"}
        size="sm"
      >
        {reviewTarget && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-surface-2 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Room</span>
                <span className="font-semibold text-text-primary">#{reviewTarget.req.roomNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Hotel</span>
                <span className="text-text-secondary">{reviewTarget.req.hotelName || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Current Price</span>
                <span className="font-semibold text-text-primary">${reviewTarget.req.currentPrice.toLocaleString()}/night</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Requested Price</span>
                <span className="font-bold text-text-primary">${reviewTarget.req.requestedPrice.toLocaleString()}/night</span>
              </div>
              {reviewTarget.req.reason && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted">Reason: <span className="text-text-secondary">{reviewTarget.req.reason}</span></p>
                </div>
              )}
            </div>

            {/* Confirmation message */}
            {reviewTarget.action === "approve" ? (
              <div className="bg-success-light border border-success/20 rounded-lg px-4 py-3">
                <p className="text-sm text-success font-semibold">Approving this request will immediately update the room price.</p>
              </div>
            ) : (
              <div className="bg-danger-light border border-danger/20 rounded-lg px-4 py-3">
                <p className="text-sm text-danger font-semibold">The room price will remain unchanged.</p>
              </div>
            )}

            {/* Note */}
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                <MessageSquare className="w-3.5 h-3.5 inline mr-1" />
                Review Note (optional)
              </label>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={2}
                placeholder="Add a note for the manager..."
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-muted outline-none focus:border-primary transition-colors resize-none"
              />
            </div>

            {reviewError && (
              <p className="text-sm text-danger bg-danger-light rounded-lg px-3 py-2">{reviewError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setReviewTarget(null)}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-border text-text-secondary hover:bg-surface-2 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReview}
                disabled={reviewing}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
                  reviewTarget.action === "approve"
                    ? "bg-success hover:bg-green-700"
                    : "bg-danger hover:bg-red-700"
                }`}
              >
                {reviewing
                  ? "Processing..."
                  : reviewTarget.action === "approve"
                  ? "Confirm Approve"
                  : "Confirm Reject"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
