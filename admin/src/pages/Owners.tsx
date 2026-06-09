import { useState, useEffect, useCallback } from "react";
import { Building2, CheckCircle, XCircle, PauseCircle, Search, RefreshCw, User, FileText, X, ExternalLink } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import Topbar from "@/components/Topbar";
import PageHeader from "@/components/PageHeader";
import { API } from "@/services/api";

interface Owner {
  _id: string;
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
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {o.kycDocuments?.length > 0 && (
                      <button onClick={() => setViewingDocs(o)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 bg-blue-400/10 hover:bg-blue-400/20 px-3 py-1.5 rounded-lg border border-blue-400/25 transition-colors">
                        <FileText className="w-3.5 h-3.5" /> View Docs
                      </button>
                    )}
                    {o.status !== "approved" && (
                      <button onClick={() => { setActionTarget(o); setActionType("approve"); setNotes(""); }}
                        className="flex items-center gap-1.5 text-xs font-semibold text-green-400 bg-green-400/10 hover:bg-green-400/20 px-3 py-1.5 rounded-lg border border-green-400/25 transition-colors">
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                    )}
                    {o.status !== "rejected" && (
                      <button onClick={() => { setActionTarget(o); setActionType("reject"); setNotes(""); }}
                        className="flex items-center gap-1.5 text-xs font-semibold text-red-400 bg-red-400/10 hover:bg-red-400/20 px-3 py-1.5 rounded-lg border border-red-400/25 transition-colors">
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    )}
                    {o.status !== "suspended" && o.status === "approved" && (
                      <button onClick={() => { setActionTarget(o); setActionType("suspend"); setNotes(""); }}
                        className="flex items-center gap-1.5 text-xs font-semibold text-orange-400 bg-orange-400/10 hover:bg-orange-400/20 px-3 py-1.5 rounded-lg border border-orange-400/25 transition-colors">
                        <PauseCircle className="w-3.5 h-3.5" /> Suspend
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
                const isPdf = doc.url.toLowerCase().endsWith(".pdf") || doc.url.includes("/raw/");
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
                        <div className="text-center py-8">
                          <FileText className="w-12 h-12 text-muted mx-auto mb-3" />
                          <p className="text-sm text-bright font-medium">PDF Document</p>
                          <a href={doc.url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline mt-2 inline-block">
                            Click to view or download PDF
                          </a>
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
    </AdminLayout>
  );
}
