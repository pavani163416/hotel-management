import { useState, useEffect } from "react";
import { Plus, Trash2, Search, X, Check, AlertCircle } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import Topbar from "@/components/Topbar";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function Amenities() {
  const [amenities, setAmenities] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newAmenity, setNewAmenity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load amenities from backend
  useEffect(() => {
    loadAmenities();
  }, []);

  const loadAmenities = async () => {
    try {
      const res = await fetch(`${API}/amenities`);
      const data = await res.json();
      if (data.success) {
        setAmenities(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load amenities:", err);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newAmenity.trim();
    
    if (!trimmed) {
      setError("Amenity name cannot be empty");
      return;
    }

    if (amenities.some(a => a.toLowerCase() === trimmed.toLowerCase())) {
      setError("This amenity already exists");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API}/amenities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setAmenities([...amenities, trimmed]);
        setNewAmenity("");
        setAddOpen(false);
        setSuccess(`"${trimmed}" added successfully!`);
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(data.message || "Failed to add amenity");
      }
    } catch (err) {
      setError("Cannot reach server. Check backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (amenity: string) => {
    if (!confirm(`Remove "${amenity}" from available amenities?\n\nNote: This won't affect existing hotels that already have this amenity.`)) {
      return;
    }

    try {
      const res = await fetch(`${API}/amenities/${encodeURIComponent(amenity)}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setAmenities(amenities.filter(a => a !== amenity));
        setSuccess(`"${amenity}" removed successfully!`);
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(data.message || "Failed to delete amenity");
        setTimeout(() => setError(""), 3000);
      }
    } catch (err) {
      setError("Cannot reach server. Check backend is running.");
      setTimeout(() => setError(""), 3000);
    }
  };

  const filtered = amenities.filter(a =>
    a.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <Topbar title="Amenities" searchPlaceholder="Search amenities..." />
      <div className="p-6">
        <PageHeader
          title="Amenities Management"
          subtitle="Manage available amenities that can be assigned to hotels."
          actions={
            <button
              onClick={() => { setAddOpen(true); setNewAmenity(""); setError(""); }}
              className="flex items-center gap-2 text-sm font-semibold bg-primary text-white rounded-lg px-4 py-2 hover:bg-primary-dark transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Amenity
            </button>
          }
        />

        {/* Success Message */}
        {success && (
          <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-success-light text-success rounded-lg border border-success/20">
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">{success}</span>
          </div>
        )}

        {/* Error Message */}
        {error && !addOpen && (
          <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-danger-light text-danger rounded-lg border border-danger/20">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        <div className="bg-white rounded-xl border border-border shadow-card">
          {/* Search Bar */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2 bg-surface-3 rounded-lg px-3 py-2 flex-1">
              <Search className="w-3.5 h-3.5 text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search amenities..."
                className="bg-transparent text-sm outline-none text-text-primary placeholder:text-muted w-full"
              />
              {search && (
                <button onClick={() => setSearch("")}>
                  <X className="w-3.5 h-3.5 text-muted" />
                </button>
              )}
            </div>
            <div className="text-xs text-muted">
              {filtered.length} of {amenities.length} amenities
            </div>
          </div>

          {/* Amenities Grid */}
          <div className="p-5">
            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted text-sm">
                  {search ? "No amenities match your search." : "No amenities available. Add your first amenity!"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filtered.map((amenity) => (
                  <div
                    key={amenity}
                    className="flex items-center justify-between px-4 py-3 bg-surface-2 rounded-lg border border-border hover:border-primary/30 transition-colors group"
                  >
                    <span className="text-sm font-medium text-text-primary">{amenity}</span>
                    <button
                      onClick={() => handleDelete(amenity)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-danger hover:bg-danger-light rounded p-1"
                      title="Delete amenity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Footer */}
          <div className="px-5 py-3 border-t border-border bg-surface-2">
            <p className="text-xs text-muted">
              💡 <strong>Tip:</strong> Amenities added here will be available when creating or editing hotels.
              Deleting an amenity won't affect hotels that already have it assigned.
            </p>
          </div>
        </div>
      </div>

      {/* Add Amenity Modal */}
      <Modal
        isOpen={addOpen}
        onClose={() => { setAddOpen(false); setNewAmenity(""); setError(""); }}
        title="Add New Amenity"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Amenity Name *
            </label>
            <input
              required
              value={newAmenity}
              onChange={(e) => setNewAmenity(e.target.value)}
              placeholder="e.g. Infinity Pool, Helipad, Private Beach"
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-primary"
              autoFocus
            />
            <p className="text-xs text-muted mt-1.5">
              Enter a descriptive name for the amenity. It will be available for all hotels.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-danger-light text-danger rounded-lg text-xs">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setAddOpen(false); setNewAmenity(""); setError(""); }}
              className="flex-1 py-2.5 border border-border rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-3 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Amenity"}
            </button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
