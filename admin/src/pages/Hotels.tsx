import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Download, MoreVertical, Edit2, Trash2, X, ImagePlus, Loader2, Clipboard, Check } from "lucide-react";
import { Hotel as HotelIcon, Building2, TrendingUp, AlertTriangle } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import Topbar from "@/components/Topbar";
import PageHeader from "@/components/PageHeader";
import StatsCard from "@/components/StatsCard";
import StatusBadge from "@/components/StatusBadge";
import Modal from "@/components/Modal";
import { useHotels, Hotel } from "@/context/HotelsContext";
import MaintenanceTab from "./MaintenanceTab";

import { API } from "@/services/api";

export default function Hotels() {
  const navigate = useNavigate();
  const { hotels, addHotel, updateHotel, deleteHotel, reloadHotels } = useHotels();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Any Status");
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Hotel | null>(null);
  const [actionTarget, setActionTarget] = useState<Hotel | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<"Hotels" | "Maintenance">("Hotels");
  const [allAmenities] = useState<string[]>([
    "Free WiFi", "Pool", "Infinity Pool", "Garden", "Gym", "Spa & Wellness",
    "Restaurant", "Bar", "Breakfast", "Coffee", "Room Service",
    "Airport Shuttle", "Parking", "Valet",
    "Beach Access", "Water Sports", "Ski-in/Ski-out",
    "Concierge", "Butler", "Business Center",
    "Fireplace Lounge", "Sunset Terrace", "Rooftop",
    "AC", "Smart TV", "Pet Friendly", "Family Friendly",
  ]);
  
  const [form, setForm] = useState({
    name: "", subtitle: "", location: "", country: "",
    pricePerNight: "500", status: "Active" as Hotel["status"],
    amenities: ["Free WiFi", "Restaurant", "Concierge"] as string[],
    floors: "1", roomsPerFloor: "10",
  });

  const toggleAmenity = (a: string) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(a)
        ? prev.amenities.filter((x) => x !== a)
        : [...prev.amenities, a],
    }));
  };

  const filtered = hotels.filter((h) => {
    const matchSearch =
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.location.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "Any Status" || h.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openAdd = () => {
    setEditTarget(null);
    setForm({ name: "", subtitle: "", location: "", country: "", pricePerNight: "500", status: "Active", amenities: ["Free WiFi", "Restaurant", "Concierge"], floors: "1", roomsPerFloor: "10" });
    setUploadedImage("");
    setUploadedImage2("");
    setUploadedImage3("");
    setSubmitted(false);
    setCopiedCreds(false);
    setAddOpen(true);
  };

  const openEdit = (h: Hotel) => {
    setEditTarget(h);
    setForm({ name: h.name, subtitle: h.subtitle, location: h.location, country: h.country, pricePerNight: "500", status: h.status, amenities: h.amenities?.length ? h.amenities : ["Free WiFi", "Restaurant", "Concierge"], floors: String(h.floors || 1), roomsPerFloor: String((h as any).roomsPerFloor || 10) });
    setUploadedImage(h.img || "");
    setUploadedImage2("");
    setUploadedImage3("");
    setSubmitted(false);
    setCopiedCreds(false);
    setAddOpen(true);
    setActionTarget(null);
  };

  const [saveError, setSaveError] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string>("");
  const [uploadedImage2, setUploadedImage2] = useState<string>("");
  const [uploadedImage3, setUploadedImage3] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploading2, setUploading2] = useState(false);
  const [uploading3, setUploading3] = useState(false);
  const [copiedCreds, setCopiedCreds] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);
  const fileInputRef3 = useRef<HTMLInputElement>(null);
  // ── Credential generation state ──────────────────────
  const [generatedCreds, setGeneratedCreds] = useState<{
    email: string; password: string; hotelName: string; hotelId: string;
  } | null>(null);

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    setSaveError("");
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        try {
          const token = localStorage.getItem("luxe_admin_token");
          const res = await fetch(`${API}/upload/image`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ image: base64, folder: "hotels" }),
          });
          const data = await res.json();
          if (data.success) {
            setUploadedImage(data.url);
            setSaveError("");
          } else {
            console.warn("Cloudinary:", data.message);
            setSaveError(`⚠ Image upload failed (${data.message}). Hotel will use default image — you can still save.`);
          }
        } catch (err: any) {
          setSaveError("⚠ Image upload failed. Hotel will use default image — you can still save.");
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
    }
  };

  const handleImageFile2 = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading2(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        try {
          const token = localStorage.getItem("luxe_admin_token");
          const res = await fetch(`${API}/upload/image`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ image: base64, folder: "hotels" }),
          });
          const data = await res.json();
          if (data.success) setUploadedImage2(data.url);
        } catch {}
        setUploading2(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading2(false);
    }
  };

  const handleImageFile3 = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading3(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        try {
          const token = localStorage.getItem("luxe_admin_token");
          const res = await fetch(`${API}/upload/image`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ image: base64, folder: "hotels" }),
          });
          const data = await res.json();
          if (data.success) setUploadedImage3(data.url);
        } catch {}
        setUploading3(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading3(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError("");
    const newHotelId = `h${Date.now()}`;
    const defaultImage = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80";
    const price = Number(form.pricePerNight) || 500;
    const hotelId = editTarget ? editTarget.hotelId : newHotelId;
    // Use Cloudinary uploaded image if available, else fallback
    const imageUrl = uploadedImage || defaultImage;

    // Build gallery: main image first, then optional second and third images
    const gallery = [imageUrl];
    if (uploadedImage2) gallery.push(uploadedImage2);
    if (uploadedImage3) gallery.push(uploadedImage3);

    const luxestayPayload = {
      hotelId,
      name:          form.name,
      location:      form.location,
      city:          form.location.split(",")[0]?.trim() || form.location,
      description:   form.subtitle || `${form.name} — a premium property in ${form.location}.`,
      image:         imageUrl,
      gallery,
      rating:        4.5,
      reviewCount:   0,
      pricePerNight: price,
      type:          "Hotel",
      coords:        [0, 0],
      amenities:     form.amenities,
      rooms:         [],
      reviews:       [],
      isActive:      form.status === "Active",
      country:       form.country.toUpperCase(),
      totalRooms:    Number(form.floors) * Number(form.roomsPerFloor),
      floors:        Number(form.floors),
      roomsPerFloor: Number(form.roomsPerFloor),
    };

    try {
      const token = localStorage.getItem("luxe_admin_token");
      const luxRes = await fetch(
        editTarget ? `${API}/hotels/${hotelId}` : `${API}/hotels`,
        { method: editTarget ? "PATCH" : "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(luxestayPayload) }
      );
      const luxData = await luxRes.json();
      if (!luxRes.ok) {
        // Show the actual error from backend
        let errMsg = luxData?.message || `Server error ${luxRes.status}`;
        if (luxData?.errors && Array.isArray(luxData.errors)) {
          errMsg = luxData.errors.map((e: any) => `${e.field}: ${e.message}`).join(" | ");
        }
        setSaveError(errMsg);
        return; // stop — don't show success
      }
      // Success — backend already syncs controller snapshot automatically
      reloadHotels();

      // ── Auto-generate manager credentials for new hotels ──
      if (!editTarget) {
        const slug = form.name
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, "")
          .split(/\s+/)
          .filter(Boolean)
          .join("")
          .slice(0, 12);
        const email = `${slug}.manager@luxestay.com`;
        const password = `Manager@${form.name.replace(/[^a-zA-Z]/g, "").slice(0, 8)}2024`;

        // Register manager in backend
        try {
          await fetch(`${API}/admin/managers`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              name:              `${form.name} Manager`,
              email,
              password,
              hotelId,
              hotelName:         form.name,
              isActive:          true,
            }),
          });
        } catch { /* non-blocking — show creds anyway */ }

        setGeneratedCreds({ email, password, hotelName: form.name, hotelId });
      }

      setSubmitted(true);
      setTimeout(() => {
        if (editTarget) { setAddOpen(false); setSubmitted(false); }
        // For new hotels, keep modal open to show credentials
      }, editTarget ? 1200 : 0);
    } catch (err: any) {
      setSaveError("Cannot reach server. Check backend is running.");
    }
  };

  const handleDelete = async (hotelId: string) => {
    if (!confirm("Remove this hotel from the portfolio?")) return;
    try {
      const token = localStorage.getItem("luxe_admin_token");
      await fetch(`${API}/hotels/${hotelId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    } catch { /* backend offline */ }
    deleteHotel(hotelId);
    setActionTarget(null);
  };

  const handleExport = () => {
    const rows = [
      ["Name", "Location", "Country", "Rooms", "Active Bookings", "YTD Revenue", "Status"],
      ...hotels.map((h) => [h.name, h.location, h.country, h.rooms, h.activeBookings, `${h.ytdRevenue}`, h.status]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "hotels.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const active = hotels.filter((h) => h.status === "Active").length;
  const maintenance = hotels.filter((h) => h.status === "Maintenance").length;

  return (
    <AdminLayout>
      <Topbar title="Hotels" searchPlaceholder="Search hotels..." />
      <div className="p-6">
        <PageHeader
          title="Hotel Portfolio"
          subtitle="Manage and monitor global property performance and status."
          actions={
            <button onClick={openAdd}
              className="flex items-center gap-2 text-sm font-semibold bg-primary text-white rounded-lg px-4 py-2 hover:bg-primary-dark transition-colors">
              <Plus className="w-4 h-4" /> Add Hotel
            </button>
          }
        />

        <div className="flex gap-1 border-b border-border mb-6">
          {(["Hotels", "Maintenance"] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                activeTab === t ? "border-primary text-primary" : "border-transparent text-muted hover:text-text-primary"
              }`}>
              {t}
            </button>
          ))}
        </div>

        {activeTab === "Maintenance" ? (
          <MaintenanceTab />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard title="Total Managed" value={hotels.length} change="+2 New" trend="up"
            icon={<HotelIcon className="w-5 h-5 text-primary" />} iconBg="bg-primary-light" />
          <StatsCard title="Active" value={active} change="Operational" trend="up"
            icon={<TrendingUp className="w-5 h-5 text-success" />} iconBg="bg-success-light" />
          <StatsCard title="Portfolio YTD" value={`${(hotels.reduce((s, h) => s + h.ytdRevenue, 0) / 1000000).toFixed(1)}M`} change="On Track" trend="neutral"
            icon={<Building2 className="w-5 h-5 text-warning" />} iconBg="bg-warning-light" />
          <StatsCard title="Maintenance" value={maintenance} change="Needs attention" trend="down"
            icon={<AlertTriangle className="w-5 h-5 text-danger" />} iconBg="bg-danger-light" />
        </div>

        <div className="bg-white rounded-xl border border-border shadow-card">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-wrap">
            <div className="flex items-center gap-2 bg-surface-3 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-muted" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or city..."
                className="bg-transparent text-sm outline-none text-text-primary placeholder:text-muted w-full" />
              {search && <button onClick={() => setSearch("")}><X className="w-3.5 h-3.5 text-muted" /></button>}
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-border rounded-lg px-3 py-2 outline-none text-text-secondary">
              <option>Any Status</option><option>Active</option><option>Maintenance</option>
            </select>
            <button onClick={handleExport}
              className="w-8 h-8 grid place-items-center border border-border rounded-lg hover:bg-surface-3 transition-colors" title="Export CSV">
              <Download className="w-4 h-4 text-muted" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["Hotel Name", "Location", "Rooms", "Active Bookings", "YTD Revenue", "Status", "Actions"].map((col) => (
                    <th key={col} className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-5 py-3">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-muted text-sm">No hotels found.</td></tr>
                ) : filtered.map((h) => (
                  <tr key={h.id}
                    onClick={() => openEdit(h)}
                    className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors cursor-pointer">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <img src={h.img} alt={h.name} className="w-10 h-10 rounded-lg object-cover" />
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{h.name}</p>
                          <p className="text-xs text-muted">{h.subtitle}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-text-primary">{h.location}</p>
                      <p className="text-xs text-muted font-semibold tracking-wider">{h.country}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-text-secondary">{h.rooms}</td>
                    <td className="px-5 py-4 text-sm text-text-secondary">{h.activeBookings}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-text-primary">${(h.ytdRevenue / 1000000).toFixed(2)}M</td>
                    <td className="px-5 py-4"><StatusBadge status={h.status} /></td>
                    <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setActionTarget(h)}
                        className="text-muted hover:text-text-primary transition-colors p-1 rounded hover:bg-surface-3">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <p className="text-xs text-muted">Showing {filtered.length} of {hotels.length} properties</p>
            <button onClick={() => navigate("/notifications")}
              className="text-xs text-primary font-semibold hover:underline">View All Notifications →</button>
          </div>
        </div>
        </>
      )}
      </div>

      {/* Add / Edit Modal */}
      <Modal isOpen={addOpen} onClose={() => { setAddOpen(false); setSubmitted(false); setSaveError(""); setGeneratedCreds(null); setCopiedCreds(false); setUploadedImage2(""); setUploadedImage3(""); }} title={editTarget ? "Edit Hotel" : "Add New Hotel"}>
        {submitted ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="w-14 h-14 bg-success-light rounded-full grid place-items-center">
              <span className="text-success text-3xl">✓</span>
            </div>
            <p className="font-semibold text-text-primary">{editTarget ? "Hotel Updated!" : "Hotel Added!"}</p>

            {/* ── Manager Credentials (new hotels only) ── */}
            {generatedCreds && !editTarget && (
              <div className="w-full mt-2 space-y-3">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }}>
                  <span className="text-emerald text-xs font-bold">✓</span>
                  <span className="text-xs font-semibold text-emerald">Manager account created automatically</span>
                </div>
                <div className="rounded-xl p-4 space-y-3"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <p className="text-xs font-semibold text-dim uppercase tracking-wider">Manager Portal Credentials</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-dim">Hotel</span>
                      <span className="text-xs font-semibold text-bright">{generatedCreds.hotelName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-dim">Email</span>
                      <code className="text-xs font-mono text-emerald bg-emerald/10 px-2 py-0.5 rounded">
                        {generatedCreds.email}
                      </code>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-dim">Password</span>
                      <code className="text-xs font-mono text-gold bg-gold/10 px-2 py-0.5 rounded">
                        {generatedCreds.password}
                      </code>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-dim">Hotel ID</span>
                      <code className="text-xs font-mono text-soft">{generatedCreds.hotelId}</code>
                    </div>
                  </div>
                  <p className="text-[10px] text-dim mt-2 pt-2"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                    ⚠ Save these credentials — they won't be shown again. Share with the hotel manager securely.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    const text = `Hotel: ${generatedCreds.hotelName}\nEmail: ${generatedCreds.email}\nPassword: ${generatedCreds.password}`;
                    try {
                      await navigator.clipboard.writeText(text);
                      setCopiedCreds(true);
                      window.setTimeout(() => setCopiedCreds(false), 1800);
                    } catch {}
                  }}
                  className="w-full py-2 rounded-xl text-xs font-semibold transition-all btn-ghost flex items-center justify-center gap-2"
                >
                  {copiedCreds ? <Check className="w-3.5 h-3.5" /> : <Clipboard className="w-3.5 h-3.5" />}
                  {copiedCreds ? "Copied" : "Copy Credentials to Clipboard"}
                </button>
                <button
                  onClick={() => { setAddOpen(false); setSubmitted(false); setGeneratedCreds(null); setCopiedCreds(false); }}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white btn-imperial"
                >
                  Done
                </button>
              </div>
            )}

            {editTarget && (
              <p className="text-xs text-dim">Hotel details have been updated.</p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            {/* Image Upload */}
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Hotel Image</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImageFile(f); }}
                className="relative w-full h-36 border-2 border-dashed border-border rounded-xl overflow-hidden cursor-pointer hover:border-primary transition-colors group"
              >
                {uploadedImage ? (
                  <>
                    <img src={uploadedImage} alt="Hotel" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-white text-xs font-semibold">Click to change</p>
                    </div>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setUploadedImage(""); }}
                      className="absolute top-2 right-2 w-6 h-6 bg-danger rounded-full grid place-items-center text-white hover:bg-danger/90">
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-muted">
                    {uploading ? (
                      <><Loader2 className="w-6 h-6 animate-spin text-primary" /><p className="text-xs">Uploading to Cloudinary...</p></>
                    ) : (
                      <><ImagePlus className="w-6 h-6" /><p className="text-xs font-medium">Click or drag & drop to upload</p><p className="text-[10px]">PNG, JPG, WEBP up to 10MB</p></>
                    )}
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = ""; }} />
              {!uploadedImage && !uploading && (
                <p className="text-[10px] text-muted mt-1">If no image is uploaded, a default hotel image will be used.</p>
              )}
            </div>

            {/* Additional Images (optional) — simple button style */}
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Additional Images <span className="text-muted font-normal normal-case">(optional, up to 2 more)</span>
              </label>
              <div className="space-y-2">

                {/* Image 2 */}
                <div className="flex items-center gap-3 p-3 border border-border rounded-xl">
                  <span className="text-xs text-muted w-14 shrink-0">Image 2</span>
                  {uploadedImage2 ? (
                    <>
                      <img src={uploadedImage2} alt="img2" className="w-12 h-10 object-cover rounded-lg shrink-0" />
                      <span className="text-xs text-muted flex-1 truncate">Uploaded ✓</span>
                      <button type="button" onClick={() => setUploadedImage2("")}
                        className="text-xs text-danger hover:underline shrink-0">Delete</button>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-muted flex-1">No image</span>
                      <button type="button" onClick={() => fileInputRef2.current?.click()}
                        disabled={uploading2}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border border-border rounded-lg hover:border-primary hover:text-primary transition-colors disabled:opacity-50 shrink-0">
                        {uploading2 ? <><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</> : <><ImagePlus className="w-3 h-3" /> Upload</>}
                      </button>
                    </>
                  )}
                  <input ref={fileInputRef2} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile2(f); e.target.value = ""; }} />
                </div>

                {/* Image 3 */}
                <div className="flex items-center gap-3 p-3 border border-border rounded-xl">
                  <span className="text-xs text-muted w-14 shrink-0">Image 3</span>
                  {uploadedImage3 ? (
                    <>
                      <img src={uploadedImage3} alt="img3" className="w-12 h-10 object-cover rounded-lg shrink-0" />
                      <span className="text-xs text-muted flex-1 truncate">Uploaded ✓</span>
                      <button type="button" onClick={() => setUploadedImage3("")}
                        className="text-xs text-danger hover:underline shrink-0">Delete</button>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-muted flex-1">No image</span>
                      <button type="button" onClick={() => fileInputRef3.current?.click()}
                        disabled={uploading3}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border border-border rounded-lg hover:border-primary hover:text-primary transition-colors disabled:opacity-50 shrink-0">
                        {uploading3 ? <><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</> : <><ImagePlus className="w-3 h-3" /> Upload</>}
                      </button>
                    </>
                  )}
                  <input ref={fileInputRef3} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile3(f); e.target.value = ""; }} />
                </div>

              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Hotel Name *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Grand Luxe Paris"
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Subtitle</label>
              <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="e.g. Premium Heritage"
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-primary" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">City *</label>
                <input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Paris"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Country *</label>
                <input required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="FRANCE"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-primary" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Floors *</label>
                <input required type="number" min="1" value={form.floors} onChange={(e) => setForm({ ...form, floors: e.target.value })} placeholder="10"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Rooms/Floor *</label>
                <input required type="number" min="1" value={form.roomsPerFloor} onChange={(e) => setForm({ ...form, roomsPerFloor: e.target.value })} placeholder="10"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Total Rooms</label>
                <input disabled type="number" value={Number(form.floors || 0) * Number(form.roomsPerFloor || 0)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-surface-2 outline-none text-muted cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Price/Night ($) *</label>
                <input required type="number" min="1" value={form.pricePerNight} onChange={(e) => setForm({ ...form, pricePerNight: e.target.value })} placeholder="500"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-primary" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Amenities</label>
              <div className="flex flex-wrap gap-2">
                {allAmenities.map((a) => (
                  <button
                    key={a} type="button"
                    aria-pressed={form.amenities.includes(a)}
                    onClick={() => toggleAmenity(a)}
                    className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      form.amenities.includes(a)
                        ? "bg-white text-primary border-white shadow-sm"
                        : "bg-surface-3 text-text-secondary border-border hover:border-primary hover:text-white"
                    }`}
                  >
                    {form.amenities.includes(a) && <Check className="w-3 h-3" />}
                    {a}
                  </button>
                ))}
              </div>
              {form.amenities.length > 0 && (
                <p className="text-xs text-muted mt-1.5">{form.amenities.length} selected</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Hotel["status"] })}
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-primary">
                <option>Active</option><option>Maintenance</option><option>Inactive</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              {saveError && (
                <div className="col-span-2 w-full px-3 py-2 bg-danger-light text-danger text-xs rounded-lg">
                  ⚠ {saveError}
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setAddOpen(false)}
                className="flex-1 py-2.5 border border-border rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-3 transition-colors">
                Cancel
              </button>
              <button type="submit"
                className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors">
                {editTarget ? "Update Hotel" : "Add Hotel"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Actions Modal */}
      <Modal isOpen={!!actionTarget} onClose={() => setActionTarget(null)} title="Hotel Actions">
        {actionTarget && (
          <div className="space-y-3">
            <div className="bg-surface-2 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <img src={actionTarget.img} alt={actionTarget.name} className="w-12 h-12 rounded-lg object-cover" />
                <div>
                  <p className="font-semibold text-text-primary">{actionTarget.name}</p>
                  <p className="text-xs text-muted">{actionTarget.location}, {actionTarget.country}</p>
                  <StatusBadge status={actionTarget.status} />
                </div>
              </div>
            </div>
            <button onClick={() => openEdit(actionTarget)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-text-primary hover:bg-surface-2 border border-border transition-colors">
              <Edit2 className="w-4 h-4 text-primary" /> Edit Hotel Details
            </button>
            <button onClick={() => { setActionTarget(null); navigate("/bookings"); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-text-primary hover:bg-surface-2 border border-border transition-colors">
              <HotelIcon className="w-4 h-4 text-success" /> View Bookings
            </button>
            <button onClick={() => { setActionTarget(null); navigate("/rooms"); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-text-primary hover:bg-surface-2 border border-border transition-colors">
              <Building2 className="w-4 h-4 text-warning" /> View Rooms
            </button>
            <button onClick={() => handleDelete(actionTarget.hotelId)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-danger hover:bg-danger-light border border-danger/20 transition-colors">
              <Trash2 className="w-4 h-4" /> Remove Hotel
            </button>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
