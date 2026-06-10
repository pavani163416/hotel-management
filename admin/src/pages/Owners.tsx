import { useState, useEffect, useCallback } from "react";
import {
  Building2, CheckCircle, XCircle, PauseCircle, Search, RefreshCw,
  User, FileText, X, ExternalLink, MapPin, Hash, Phone, Mail,
  Calendar, ClipboardList, ChevronRight, ChevronDown
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import Topbar from "@/components/Topbar";
import PageHeader from "@/components/PageHeader";
import { API } from "@/services/api";

interface Owner {
  _id: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  kycStatus: string;
  isEmailVerified: boolean;
  kycDocuments: { type: string; url: string; uploadedAt: string }[];
  hotelIds: string[];
  createdAt: string;
  adminNotes?: string;
  // Business / application fields returned from backend
  businessName?: string;
  hotelName?: string;
  hotelAddress?: string;
  gstNumber?: string;
  businessRegistrationNumber?: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-yellow-500/15 text-yellow-700 border-yellow-300",
  approved:  "bg-green-500/15 text-green-700 border-green-300",
  rejected:  "bg-red-500/15 text-red-700 border-red-300",
  suspended: "bg-orange-500/15 text-orange-700 border-orange-300",
};

export default function Owners() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionTarget, setActionTarget] = useState<Owner | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "suspend" | null>(null);
  const [notes, setNotes] = useState("");
  const [actioning, setActioning] = useState(false);
  const [error, setError] = useState("");
  const [viewingDocs, setViewingDocs] = useState<Owner | null>(null);
  const [viewingDetails, setViewingDetails] = useState<Owner | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // Hotel Assignment states
  const [assigningOwner, setAssigningOwner] = useState<Owner | null>(null);
  const [viewingAssignedOwner, setViewingAssignedOwner] = useState<Owner | null>(null);
  const [availableHotels, setAvailableHotels] = useState<any[]>([]);
  const [assignedHotels, setAssignedHotels] = useState<any[]>([]);
  const [selectedHotelIds, setSelectedHotelIds] = useState<string[]>([]);
  const [hotelLoading, setHotelLoading] = useState(false);
  const [hotelActioning, setHotelActioning] = useState(false);

  const fetchAvailableHotels = useCallback(async () => {
    setHotelLoading(true);
    try {
      const token = localStorage.getItem("luxe_admin_token");
      const res = await fetch(`${API}/admin/hotels/all-unassigned`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setAvailableHotels(data.data || []);
    } catch {
      setError("Failed to load available hotels.");
    } finally {
      setHotelLoading(false);
    }
  }, []);

  const fetchAssignedHotels = useCallback(async (owner: Owner) => {
    if (!owner.userId) return;
    setHotelLoading(true);
    try {
      const token = localStorage.getItem("luxe_admin_token");
      const res = await fetch(`${API}/admin/property-owners/${owner.userId}/hotels`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setAssignedHotels(data.data || []);
    } catch {
      setError("Failed to load assigned hotels.");
    } finally {
      setHotelLoading(false);
    }
  }, []);

  const handleAssignHotels = async () => {
    if (!assigningOwner || !assigningOwner.userId || selectedHotelIds.length === 0) return;
    setHotelActioning(true);
    setError("");
    try {
      const token = localStorage.getItem("luxe_admin_token");
      const res = await fetch(`${API}/admin/property-owners/${assigningOwner.userId}/assign-hotel`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ hotelIds: selectedHotelIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Assignment failed.");
      }
      setAssigningOwner(null);
      setSelectedHotelIds([]);
      fetchOwners();
    } catch (err: any) {
      setError(err.message || "Failed to assign hotels.");
    } finally {
      setHotelActioning(false);
    }
  };

  const handleRemoveHotelAssignment = async (hotelId: string) => {
    if (!viewingAssignedOwner || !viewingAssignedOwner.userId) return;
    setHotelActioning(true);
    setError("");
    try {
      const token = localStorage.getItem("luxe_admin_token");
      const res = await fetch(`${API}/admin/property-owners/${viewingAssignedOwner.userId}/hotels/${hotelId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Removal failed.");
      }
      fetchAssignedHotels(viewingAssignedOwner);
      fetchOwners();
    } catch (err: any) {
      setError(err.message || "Failed to remove hotel assignment.");
    } finally {
      setHotelActioning(false);
    }
  };

  useEffect(() => {
    if (assigningOwner) {
      fetchAvailableHotels();
      setSelectedHotelIds([]);
    }
  }, [assigningOwner, fetchAvailableHotels]);

  useEffect(() => {
    if (viewingAssignedOwner) {
      fetchAssignedHotels(viewingAssignedOwner);
    }
  }, [viewingAssignedOwner, fetchAssignedHotels]);

  const fetchOwners = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("luxe_admin_token");
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await fetch(`${API}/owners/admin/list${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setOwners(data.data || []);
    } catch { setError("Failed to load owners."); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchOwners(); }, [fetchOwners]);

  const doAction = async () => {
    if (!actionTarget || !actionType) return;
    setActioning(true);
    try {
      const token = localStorage.getItem("luxe_admin_token");
      await fetch(`${API}/owners/admin/${actionTarget._id}/${actionType}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes, reason: notes }),
      });
      setActionTarget(null); setActionType(null); setNotes("");
      fetchOwners();
    } catch { setError("Action failed."); }
    finally { setActioning(false); }
  };

  const filtered = owners.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <Topbar title="Property Owners" />
      <div className="p-6 space-y-6">
        <PageHeader
          title="Property Owner Management"
          subtitle="Review, approve, reject, or suspend property owner applications."
        />

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total", value: owners.length, color: "text-bright" },
            { label: "Pending", value: owners.filter((o) => o.status === "pending").length, color: "text-yellow-400" },
            { label: "Approved", value: owners.filter((o) => o.status === "approved").length, color: "text-green-400" },
            { label: "Suspended", value: owners.filter((o) => o.status === "suspended").length, color: "text-orange-400" },
          ].map((s) => (
            <div key={s.label} className="bg-white/3 border border-border rounded-xl p-4 text-center" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 flex-1 min-w-[200px]" style={{ background: "rgba(255,255,255,0.05)" }}>
            <Search className="w-4 h-4 text-muted shrink-0" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search owners..."
              className="bg-transparent text-sm outline-none w-full text-bright placeholder:text-muted" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent border border-border rounded-lg px-3 py-2 text-sm text-bright outline-none"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <option value="all" className="bg-[#0f1d30]">All Status</option>
            <option value="pending" className="bg-[#0f1d30]">Pending</option>
            <option value="approved" className="bg-[#0f1d30]">Approved</option>
            <option value="rejected" className="bg-[#0f1d30]">Rejected</option>
            <option value="suspended" className="bg-[#0f1d30]">Suspended</option>
          </select>
          <button onClick={fetchOwners} className="w-9 h-9 grid place-items-center border border-border rounded-lg hover:bg-white/5 transition-colors" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <RefreshCw className="w-4 h-4 text-muted" />
          </button>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {/* Table */}
        <div className="rounded-xl border overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)" }}>
          {loading ? (
            <div className="p-12 text-center text-muted text-sm">Loading owners...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted text-sm">No owners found.</div>
          ) : (
            <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {filtered.map((o) => (
                <div key={o._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-white/2 transition-colors" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full grid place-items-center shrink-0" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <User className="w-4 h-4 text-muted" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-bright">{o.name}</p>
                      <p className="text-xs text-muted">{o.email} · {o.phone}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${STATUS_COLORS[o.status] || STATUS_COLORS.pending}`}>
                          {o.status}
                        </span>
                        <span className="text-[10px] text-muted">KYC: {o.kycStatus}</span>
                        {o.isEmailVerified && <span className="text-[10px] text-green-400">✓ Email verified</span>}
                        <span className="text-[10px] text-muted">{o.hotelIds?.length || 0} hotel(s)</span>
                        {o.kycDocuments?.length > 0 && (
                          <span className="text-[10px] text-blue-400">{o.kycDocuments.length} doc(s)</span>
                        )}
                      </div>
                      {/* Business summary inline */}
                      {o.businessName && (
                        <p className="text-[10px] text-soft mt-1">
                          <span className="text-muted">Business:</span> {o.businessName}
                          {o.hotelName && <> &nbsp;·&nbsp; <span className="text-muted">Hotel:</span> {o.hotelName}</>}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="relative shrink-0">
                    <button 
                      onClick={() => setActiveDropdownId(activeDropdownId === o._id ? null : o._id)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-bright bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 transition-colors"
                      style={{ borderColor: "rgba(255,255,255,0.08)" }}
                    >
                      Actions <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {activeDropdownId === o._id && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setActiveDropdownId(null)}
                        />
                        <div 
                          className="absolute right-0 mt-1.5 w-48 rounded-xl border border-white/8 bg-[#0f1d30] shadow-xl z-20 py-1.5 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-1 duration-100"
                          style={{ borderColor: "rgba(255,255,255,0.12)", background: "#0f1d30" }}
                        >
                          <button 
                            onClick={() => { setViewingDetails(o); setActiveDropdownId(null); }}
                            className="w-full text-left px-4 py-2 text-xs font-medium text-bright hover:bg-white/5 transition-colors flex items-center gap-2"
                          >
                            <ClipboardList className="w-3.5 h-3.5 text-purple-400" /> View Details
                          </button>
                          
                          {o.kycDocuments?.length > 0 && (
                            <button 
                              onClick={() => { setViewingDocs(o); setActiveDropdownId(null); }}
                              className="w-full text-left px-4 py-2 text-xs font-medium text-bright hover:bg-white/5 transition-colors flex items-center gap-2"
                            >
                              <FileText className="w-3.5 h-3.5 text-blue-400" /> View Docs
                            </button>
                          )}

                          {o.status === "approved" && (
                            <>
                              <button 
                                onClick={() => { setAssigningOwner(o); setActiveDropdownId(null); }}
                                className="w-full text-left px-4 py-2 text-xs font-medium text-bright hover:bg-white/5 transition-colors flex items-center gap-2"
                              >
                                <Building2 className="w-3.5 h-3.5 text-teal-400" /> Assign Hotel
                              </button>
                              <button 
                                onClick={() => { setViewingAssignedOwner(o); setActiveDropdownId(null); }}
                                className="w-full text-left px-4 py-2 text-xs font-medium text-bright hover:bg-white/5 transition-colors flex items-center gap-2"
                              >
                                <Building2 className="w-3.5 h-3.5 text-indigo-400" /> View Assigned
                              </button>
                            </>
                          )}

                          {o.status !== "approved" && (
                            <button 
                              onClick={() => { setActionTarget(o); setActionType("approve"); setNotes(""); setActiveDropdownId(null); }}
                              className="w-full text-left px-4 py-2 text-xs font-medium text-bright hover:bg-white/5 transition-colors flex items-center gap-2"
                            >
                              <CheckCircle className="w-3.5 h-3.5 text-green-400" /> Approve Owner
                            </button>
                          )}

                          {o.status !== "rejected" && (
                            <button 
                              onClick={() => { setActionTarget(o); setActionType("reject"); setNotes(""); setActiveDropdownId(null); }}
                              className="w-full text-left px-4 py-2 text-xs font-medium text-bright hover:bg-white/5 transition-colors flex items-center gap-2"
                            >
                              <XCircle className="w-3.5 h-3.5 text-red-400" /> Reject Application
                            </button>
                          )}

                          {o.status !== "suspended" && o.status === "approved" && (
                            <button 
                              onClick={() => { setActionTarget(o); setActionType("suspend"); setNotes(""); setActiveDropdownId(null); }}
                              className="w-full text-left px-4 py-2 text-xs font-medium text-bright hover:bg-white/5 transition-colors flex items-center gap-2"
                            >
                              <PauseCircle className="w-3.5 h-3.5 text-orange-400" /> Suspend Owner
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Full Application Details Modal ── */}
      {viewingDetails && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm grid place-items-center z-50 p-4">
          <div className="rounded-2xl border flex flex-col w-full max-w-2xl max-h-[90vh]" style={{ background: "#0f1d30", borderColor: "rgba(255,255,255,0.12)" }}>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
              <div>
                <h3 className="font-semibold text-bright text-lg">Application Details</h3>
                <p className="text-xs text-muted mt-1">Full information submitted by the property owner</p>
              </div>
              <button onClick={() => setViewingDetails(null)} className="text-muted hover:text-bright transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5">
              {/* Applicant Info */}
              <div className="rounded-xl border p-4 space-y-3" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <User className="w-3.5 h-3.5" /> Applicant Information
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-muted uppercase tracking-wide">Full Name</p>
                    <p className="text-sm font-semibold text-bright mt-0.5">{viewingDetails.name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted uppercase tracking-wide">Status</p>
                    <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border capitalize mt-0.5 ${STATUS_COLORS[viewingDetails.status] || STATUS_COLORS.pending}`}>
                      {viewingDetails.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-muted shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted uppercase tracking-wide">Email</p>
                      <p className="text-sm text-bright">{viewingDetails.email || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-muted shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted uppercase tracking-wide">Phone</p>
                      <p className="text-sm text-bright">{viewingDetails.phone || "—"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted uppercase tracking-wide">Email Verified</p>
                    <p className={`text-sm font-semibold mt-0.5 ${viewingDetails.isEmailVerified ? "text-green-400" : "text-red-400"}`}>
                      {viewingDetails.isEmailVerified ? "✓ Verified" : "✗ Not Verified"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-muted shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted uppercase tracking-wide">Applied On</p>
                      <p className="text-sm text-bright">
                        {viewingDetails.createdAt ? new Date(viewingDetails.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Property & Business Details */}
              <div className="rounded-xl border p-4 space-y-3" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5" /> Property & Business Details
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <p className="text-[10px] text-muted uppercase tracking-wide">Business / Legal Name</p>
                    <p className="text-sm font-semibold text-bright mt-0.5">{viewingDetails.businessName || <span className="text-muted italic">Not provided</span>}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-muted uppercase tracking-wide">Hotel / Resort Name</p>
                      <p className="text-sm text-bright mt-0.5">{viewingDetails.hotelName || <span className="text-muted italic">Not provided</span>}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-muted shrink-0 mt-1" />
                      <div>
                        <p className="text-[10px] text-muted uppercase tracking-wide">Hotel Address</p>
                        <p className="text-sm text-bright mt-0.5">{viewingDetails.hotelAddress || <span className="text-muted italic">Not provided</span>}</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-start gap-2">
                      <Hash className="w-3.5 h-3.5 text-muted shrink-0 mt-1" />
                      <div>
                        <p className="text-[10px] text-muted uppercase tracking-wide">GST Number</p>
                        <p className="text-sm text-bright mt-0.5">{viewingDetails.gstNumber || <span className="text-muted italic">Not provided</span>}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Hash className="w-3.5 h-3.5 text-muted shrink-0 mt-1" />
                      <div>
                        <p className="text-[10px] text-muted uppercase tracking-wide">Business Reg. No.</p>
                        <p className="text-sm text-bright mt-0.5">{viewingDetails.businessRegistrationNumber || <span className="text-muted italic">Not provided</span>}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* KYC Documents Summary */}
              <div className="rounded-xl border p-4" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" /> KYC Documents
                </h4>
                {viewingDetails.kycDocuments?.length > 0 ? (
                  <div className="space-y-2">
                    {viewingDetails.kycDocuments.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <div>
                          <p className="text-sm font-semibold text-bright capitalize">{doc.type?.replace("_", " ") || "Document"}</p>
                          <p className="text-xs text-muted">Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                        </div>
                        <a href={doc.url} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 bg-blue-400/10 px-3 py-1.5 rounded-lg border border-blue-400/20 transition-colors">
                          <ExternalLink className="w-3.5 h-3.5" /> View
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted italic">No documents uploaded.</p>
                )}
              </div>

              {/* Admin Notes */}
              {viewingDetails.adminNotes && (
                <div className="rounded-xl border p-4" style={{ background: "rgba(255,100,50,0.05)", borderColor: "rgba(255,100,50,0.2)" }}>
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Admin Notes</h4>
                  <p className="text-sm text-bright">{viewingDetails.adminNotes}</p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center gap-3 p-5 border-t" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
              {viewingDetails.status !== "approved" && (
                <button
                  onClick={() => { setActionTarget(viewingDetails); setActionType("approve"); setNotes(""); setViewingDetails(null); }}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors">
                  Approve
                </button>
              )}
              {viewingDetails.status !== "rejected" && (
                <button
                  onClick={() => { setActionTarget(viewingDetails); setActionType("reject"); setNotes(""); setViewingDetails(null); }}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors">
                  Reject
                </button>
              )}
              <button onClick={() => setViewingDetails(null)}
                className="flex-1 py-2 border border-border rounded-lg text-sm text-muted hover:bg-white/5 transition-colors"
                style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {actionTarget && actionType && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm grid place-items-center z-50 p-4">
          <div className="rounded-xl border p-6 w-full max-w-sm space-y-4" style={{ background: "#0f1d30", borderColor: "rgba(255,255,255,0.12)" }}>
            <h3 className="font-semibold text-bright capitalize">{actionType} Owner</h3>
            <p className="text-sm text-muted">
              {actionType === "approve" ? "Approve" : actionType === "reject" ? "Reject" : "Suspend"}{" "}
              <strong className="text-bright">{actionTarget.name}</strong>?
            </p>
            {actionType === "approve" && (!actionTarget.kycDocuments || actionTarget.kycDocuments.length === 0) && (
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-3">
                <strong>Warning:</strong> This owner has not uploaded any KYC documents. Are you sure you want to approve them?
              </p>
            )}
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder={actionType === "approve" ? "Optional notes..." : "Reason (required for reject/suspend)"}
              rows={3}
              className="w-full bg-transparent border border-border rounded-lg px-3 py-2 text-sm text-bright outline-none resize-none"
              style={{ borderColor: "rgba(255,255,255,0.12)" }} />
            <div className="flex gap-3">
              <button onClick={() => { setActionTarget(null); setActionType(null); }}
                className="flex-1 py-2 border border-border rounded-lg text-sm text-muted hover:bg-white/5 transition-colors"
                style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                Cancel
              </button>
              <button onClick={doAction} disabled={actioning}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                  actionType === "approve" ? "bg-green-600 hover:bg-green-700" :
                  actionType === "reject" ? "bg-red-600 hover:bg-red-700" :
                  "bg-orange-600 hover:bg-orange-700"
                }`}>
                {actioning ? "..." : `Confirm ${actionType}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewingDocs && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm grid place-items-center z-50 p-4">
          <div className="rounded-2xl border flex flex-col w-full max-w-4xl max-h-[90vh]" style={{ background: "#0f1d30", borderColor: "rgba(255,255,255,0.12)" }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
              <div>
                <h3 className="font-semibold text-bright text-lg">KYC Documents: {viewingDocs.name}</h3>
                <p className="text-xs text-muted mt-1">{viewingDocs.email}</p>
              </div>
              <button onClick={() => setViewingDocs(null)} className="text-muted hover:text-bright transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-6">
              {viewingDocs.kycDocuments.map((doc, idx) => {
                const isPdf = doc.url.toLowerCase().endsWith(".pdf") || doc.url.includes("/raw/") || doc.url.toLowerCase().includes("receipt");
                return (
                  <div key={idx} className="border rounded-xl overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                    <div className="bg-white/5 px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                      <div>
                        <p className="text-sm font-semibold text-bright uppercase">{doc.type.replace("_", " ")}</p>
                        <p className="text-xs text-muted mt-0.5">Uploaded: {new Date(doc.uploadedAt).toLocaleString()}</p>
                      </div>
                      <a href={doc.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
                        <ExternalLink className="w-3.5 h-3.5" /> Open
                      </a>
                    </div>
                    <div className="bg-black/20 p-4 flex justify-center">
                      {isPdf ? (
                        <div className="flex flex-col items-center gap-4 w-full">
                          {doc.url.includes("/image/upload/") && (
                            <div className="w-full flex justify-center bg-white/5 p-2 rounded-lg border border-white/10 max-w-2xl">
                              <img 
                                src={doc.url.replace(/\.pdf$/i, ".png")} 
                                alt={`${doc.type} PDF Preview`} 
                                className="max-w-full max-h-[500px] object-contain rounded-lg"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          <div className="text-center py-2">
                            <FileText className="w-10 h-10 text-muted mx-auto mb-2" />
                            <p className="text-sm text-bright font-medium">PDF Document</p>
                            <a href={doc.url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline mt-1 inline-block">
                              Click to view or download PDF
                            </a>
                          </div>
                        </div>
                      ) : (
                        <img src={doc.url} alt={`${doc.type} Document`} className="max-w-full max-h-[400px] object-contain rounded-lg border border-white/10" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {/* Assign Hotel Modal */}
      {assigningOwner && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm grid place-items-center z-50 p-4">
          <div className="rounded-2xl border flex flex-col w-full max-w-md max-h-[80vh]" style={{ background: "#0f1d30", borderColor: "rgba(255,255,255,0.12)" }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
              <div>
                <h3 className="font-semibold text-bright text-lg">Assign Hotels</h3>
                <p className="text-xs text-muted mt-1">To: {assigningOwner.name}</p>
              </div>
              <button onClick={() => setAssigningOwner(null)} className="text-muted hover:text-bright transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto space-y-4">
              {hotelLoading ? (
                <div className="py-8 text-center text-sm text-muted">Loading available hotels...</div>
              ) : availableHotels.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted italic">All hotels are currently assigned to owners.</div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted font-medium uppercase tracking-wider mb-2">Available Hotels</p>
                  {availableHotels.map((hotel) => (
                    <label key={hotel._id} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-white/5 transition-colors" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
                      <input 
                        type="checkbox"
                        checked={selectedHotelIds.includes(hotel.hotelId)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedHotelIds([...selectedHotelIds, hotel.hotelId]);
                          } else {
                            setSelectedHotelIds(selectedHotelIds.filter(id => id !== hotel.hotelId));
                          }
                        }}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 bg-transparent"
                      />
                      <div>
                        <p className="text-sm font-semibold text-bright">{hotel.name}</p>
                        <p className="text-xs text-muted">{hotel.city}, {hotel.location}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 p-5 border-t" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
              <button onClick={() => setAssigningOwner(null)}
                className="flex-1 py-2 border border-border rounded-lg text-sm text-muted hover:bg-white/5 transition-colors"
                style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                Cancel
              </button>
              <button 
                onClick={handleAssignHotels} 
                disabled={hotelActioning || selectedHotelIds.length === 0}
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors disabled:opacity-50">
                {hotelActioning ? "Assigning..." : `Assign (${selectedHotelIds.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Assigned Hotels Modal */}
      {viewingAssignedOwner && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm grid place-items-center z-50 p-4">
          <div className="rounded-2xl border flex flex-col w-full max-w-md max-h-[80vh]" style={{ background: "#0f1d30", borderColor: "rgba(255,255,255,0.12)" }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
              <div>
                <h3 className="font-semibold text-bright text-lg">Assigned Hotels</h3>
                <p className="text-xs text-muted mt-1">Owner: {viewingAssignedOwner.name}</p>
              </div>
              <button onClick={() => setViewingAssignedOwner(null)} className="text-muted hover:text-bright transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {hotelLoading ? (
                <div className="py-8 text-center text-sm text-muted">Loading assigned hotels...</div>
              ) : assignedHotels.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted italic">No hotels assigned to this owner yet.</div>
              ) : (
                <div className="space-y-2">
                  {assignedHotels.map((hotel) => (
                    <div key={hotel._id} className="flex items-center justify-between p-3 rounded-lg border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
                      <div>
                        <p className="text-sm font-semibold text-bright">{hotel.name}</p>
                        <p className="text-xs text-muted">{hotel.city}, {hotel.location}</p>
                      </div>
                      <button 
                        onClick={() => handleRemoveHotelAssignment(hotel._id)}
                        disabled={hotelActioning}
                        className="text-xs font-semibold text-red-400 bg-red-400/10 hover:bg-red-400/20 px-2.5 py-1.5 rounded-lg border border-red-400/20 transition-colors">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 p-5 border-t" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
              <button onClick={() => setViewingAssignedOwner(null)}
                className="w-full py-2 border border-border rounded-lg text-sm text-muted hover:bg-white/5 transition-colors"
                style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
