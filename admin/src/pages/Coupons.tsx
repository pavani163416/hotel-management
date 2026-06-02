import { useState, useEffect, useCallback } from "react";
import {
  Plus, Search, X, Tag, Edit2, Trash2,
  CheckCircle, XCircle, RefreshCw, Percent, DollarSign,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import Topbar from "@/components/Topbar";
import PageHeader from "@/components/PageHeader";
import StatsCard from "@/components/StatsCard";
import Modal from "@/components/Modal";
import { getCoupons, createCoupon, updateCoupon, deleteCoupon } from "@/services/api";

interface Coupon {
  _id: string;
  code: string;
  description: string;
  type: "percentage" | "fixed";
  value: number;
  minBookingAmount: number;
  maxDiscount: number | null;
  applicableHotelIds: string[];
  validFrom: string;
  validUntil: string | null;
  usageLimit: number | null;
  usedCount: number;
  firstTimeOnly: boolean;
  isActive: boolean;
  createdAt: string;
}

const EMPTY_FORM = {
  code: "", description: "", type: "percentage" as "percentage" | "fixed",
  value: 10, minBookingAmount: 0, maxDiscount: "", validUntil: "",
  usageLimit: "", firstTimeOnly: false, isActive: true,
};

function formatDate(iso: string | null) {
  if (!iso) return "No expiry";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function Coupons() {
  const [coupons, setCoupons]     = useState<Coupon[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]       = useState("");
  const [filterActive, setFilterActive] = useState<"" | "true" | "false">("");

  // Modal state
  const [showForm, setShowForm]   = useState(false);
  const [editTarget, setEditTarget] = useState<Coupon | null>(null);
  const [form, setForm]           = useState({ ...EMPTY_FORM });
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [deleting, setDeleting]   = useState(false);

  const fetchCoupons = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (filterActive !== "") params.isActive = filterActive;
      const res: any = await getCoupons(params);
      setCoupons(res?.data || []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [filterActive]);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  const filtered = coupons.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.code.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
  });

  const stats = {
    total:   coupons.length,
    active:  coupons.filter((c) => c.isActive && (!c.validUntil || new Date(c.validUntil) >= new Date())).length,
    used:    coupons.reduce((s, c) => s + c.usedCount, 0),
  };

  const openCreate = () => {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM });
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (c: Coupon) => {
    setEditTarget(c);
    setForm({
      code:             c.code,
      description:      c.description,
      type:             c.type,
      value:            c.value,
      minBookingAmount: c.minBookingAmount,
      maxDiscount:      c.maxDiscount !== null ? String(c.maxDiscount) : "",
      validUntil:       c.validUntil ? c.validUntil.slice(0, 10) : "",
      usageLimit:       c.usageLimit !== null ? String(c.usageLimit) : "",
      firstTimeOnly:    c.firstTimeOnly,
      isActive:         c.isActive,
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.description.trim() || !form.value) {
      setFormError("Code, description and value are required.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        code:             form.code.toUpperCase().trim(),
        description:      form.description.trim(),
        type:             form.type,
        value:            Number(form.value),
        minBookingAmount: Number(form.minBookingAmount) || 0,
        maxDiscount:      form.maxDiscount ? Number(form.maxDiscount) : null,
        validUntil:       form.validUntil || null,
        usageLimit:       form.usageLimit ? Number(form.usageLimit) : null,
        firstTimeOnly:    form.firstTimeOnly,
        isActive:         form.isActive,
      };
      if (editTarget) {
        await updateCoupon(editTarget._id, payload);
      } else {
        await createCoupon(payload);
      }
      setShowForm(false);
      fetchCoupons(true);
    } catch (err: any) {
      setFormError(err.message || "Failed to save coupon.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCoupon(deleteTarget._id);
      setDeleteTarget(null);
      fetchCoupons(true);
    } catch {}
    finally { setDeleting(false); }
  };

  const toggleActive = async (c: Coupon) => {
    try {
      await updateCoupon(c._id, { isActive: !c.isActive });
      fetchCoupons(true);
    } catch {}
  };

  return (
    <AdminLayout>
      <Topbar title="Coupons & Offers" />
      <div className="p-6 space-y-6">
        <PageHeader
          title="Coupons & Offers"
          subtitle="Create and manage discount codes and promotional offers for guests."
          actions={
            <div className="flex items-center gap-2">
              <button onClick={() => fetchCoupons(true)} disabled={refreshing}
                className="flex items-center gap-2 text-sm font-medium text-text-secondary border border-border rounded-lg px-4 py-2 hover:bg-surface-3 transition-colors disabled:opacity-50">
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button onClick={openCreate}
                className="flex items-center gap-2 text-sm font-semibold bg-primary text-white rounded-lg px-4 py-2 hover:bg-primary-dark transition-colors">
                <Plus className="w-4 h-4" /> New Coupon
              </button>
            </div>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatsCard title="Total Coupons" value={stats.total} change="All codes"
            icon={<Tag className="w-5 h-5 text-primary" />} iconBg="bg-primary-light" />
          <StatsCard title="Active" value={stats.active} change="Currently valid"
            icon={<CheckCircle className="w-5 h-5 text-success" />} iconBg="bg-success-light" />
          <StatsCard title="Total Uses" value={stats.used} change="Across all coupons"
            icon={<Percent className="w-5 h-5 text-text-secondary" />} iconBg="bg-surface-3" />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-border shadow-card">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2 bg-surface-3 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-muted shrink-0" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search code or description..."
                className="bg-transparent text-sm outline-none w-full placeholder:text-muted" />
              {search && <button onClick={() => setSearch("")}><X className="w-3.5 h-3.5 text-muted" /></button>}
            </div>
            <div className="flex gap-1.5">
              {([["", "All"], ["true", "Active"], ["false", "Inactive"]] as const).map(([val, label]) => (
                <button key={val} onClick={() => setFilterActive(val)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${filterActive === val ? "bg-primary text-white" : "bg-surface-3 text-muted hover:bg-surface-2"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  {["Code", "Description", "Discount", "Min Order", "Usage", "Expiry", "First-Time", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="px-5 py-12 text-center text-muted text-sm">Loading coupons...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="px-5 py-12 text-center text-muted text-sm">
                    No coupons found.{" "}
                    <button onClick={openCreate} className="text-primary font-semibold hover:underline">Create one →</button>
                  </td></tr>
                ) : filtered.map((c) => {
                  const isExpired = c.validUntil && new Date(c.validUntil) < new Date();
                  return (
                    <tr key={c._id} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-sm font-bold text-primary bg-primary-light px-2 py-0.5 rounded">{c.code}</span>
                      </td>
                      <td className="px-4 py-3.5 max-w-[180px]">
                        <p className="text-sm text-text-secondary truncate">{c.description}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 text-sm font-bold text-success">
                          {c.type === "percentage" ? <Percent className="w-3.5 h-3.5" /> : <DollarSign className="w-3.5 h-3.5" />}
                          {c.value}{c.type === "percentage" ? "%" : ""}
                        </div>
                        {c.maxDiscount && <p className="text-xs text-muted">max ${c.maxDiscount}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm text-text-secondary">{c.minBookingAmount > 0 ? `$${c.minBookingAmount}` : "—"}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm text-text-secondary">
                          {c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}
                        </p>
                        {c.usageLimit && (
                          <div className="w-16 h-1 bg-surface-3 rounded-full mt-1">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (c.usedCount / c.usageLimit) * 100)}%` }} />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className={`text-xs ${isExpired ? "text-danger font-semibold" : "text-text-secondary"}`}>
                          {isExpired ? "Expired" : formatDate(c.validUntil)}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.firstTimeOnly ? "bg-warning-light text-warning" : "bg-surface-3 text-muted"}`}>
                          {c.firstTimeOnly ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <button onClick={() => toggleActive(c)}
                          className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${c.isActive && !isExpired ? "bg-success-light text-success hover:bg-success hover:text-white" : "bg-danger-light text-danger hover:bg-danger hover:text-white"}`}>
                          {c.isActive && !isExpired ? <><CheckCircle className="w-3 h-3" /> Active</> : <><XCircle className="w-3 h-3" /> Inactive</>}
                        </button>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => openEdit(c)}
                            className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-primary-light transition-colors">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteTarget(c)}
                            className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger-light transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)}
        title={editTarget ? `Edit Coupon — ${editTarget.code}` : "Create New Coupon"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Code *</label>
              <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="SUMMER20" disabled={!!editTarget}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm font-mono outline-none focus:border-primary disabled:opacity-60 disabled:bg-surface-2" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Type *</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary">
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Description *</label>
            <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="10% off your stay"
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Value * {form.type === "percentage" ? "(%)" : "($)"}
              </label>
              <input required type="number" min="0" value={form.value}
                onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Min Order ($)</label>
              <input type="number" min="0" value={form.minBookingAmount}
                onChange={(e) => setForm({ ...form, minBookingAmount: Number(e.target.value) })}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Max Discount ($)</label>
              <input type="number" min="0" value={form.maxDiscount} placeholder="No cap"
                onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Usage Limit</label>
              <input type="number" min="1" value={form.usageLimit} placeholder="Unlimited"
                onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Valid Until</label>
            <input type="date" value={form.validUntil}
              onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary" />
            <p className="text-xs text-muted mt-1">Leave blank for no expiry</p>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.firstTimeOnly}
                onChange={(e) => setForm({ ...form, firstTimeOnly: e.target.checked })}
                className="w-4 h-4 accent-primary" />
              <span className="text-sm text-text-secondary">First-time guests only</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="w-4 h-4 accent-primary" />
              <span className="text-sm text-text-secondary">Active</span>
            </label>
          </div>

          {formError && <p className="text-sm text-danger bg-danger-light rounded-lg px-3 py-2">{formError}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-border text-text-secondary hover:bg-surface-2 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-60">
              {saving ? "Saving..." : editTarget ? "Save Changes" : "Create Coupon"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Coupon" size="sm">
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Are you sure you want to delete coupon <strong className="font-mono text-primary">{deleteTarget.code}</strong>?
              This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-border text-text-secondary hover:bg-surface-2 transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-danger text-white hover:bg-red-700 transition-colors disabled:opacity-60">
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
