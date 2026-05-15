/**
 * TopDeals — Admin-only page to manage which hotels appear in the
 * "Top Deals" carousel on the user-facing Hotels page.
 *
 * Fields controlled here:
 *   isDeal       — whether the hotel shows in the Top Deals section
 *   discountPct  — discount percentage shown on the deal badge (e.g. 20 → "-20%")
 *   originalPrice — crossed-out price shown next to the discounted price
 */

import { useState, useEffect, useCallback } from "react";
import { Tag, Percent, RefreshCw, Save, X, CheckCircle, AlertCircle } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import Topbar from "@/components/Topbar";
import PageHeader from "@/components/PageHeader";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

type HotelDeal = {
  hotelId:       string;
  name:          string;
  image:         string;
  location:      string;
  pricePerNight: number;
  isDeal:        boolean;
  discountPct:   number;
  originalPrice: number | null;
};

type EditState = {
  isDeal:        boolean;
  discountPct:   string;
  originalPrice: string;
};

export default function TopDeals() {
  const [hotels, setHotels]       = useState<HotelDeal[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [edits, setEdits]         = useState<Record<string, EditState>>({});
  const [saving, setSaving]       = useState<Record<string, boolean>>({});
  const [saved, setSaved]         = useState<Record<string, boolean>>({});
  const [errors, setErrors]       = useState<Record<string, string>>({});

  const fetchHotels = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await fetch(`${API}/hotels`);
      const json = await res.json();
      const raw: any[] = Array.isArray(json?.data) ? json.data : [];
      const mapped: HotelDeal[] = raw.map((h) => ({
        hotelId:       h.hotelId,
        name:          h.name,
        image:         h.image || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=60",
        location:      h.location,
        pricePerNight: h.pricePerNight || 0,
        isDeal:        h.isDeal || false,
        discountPct:   h.discountPct || 0,
        originalPrice: h.originalPrice || null,
      }));
      setHotels(mapped);
      // Initialise edit state from current DB values
      const initEdits: Record<string, EditState> = {};
      mapped.forEach((h) => {
        initEdits[h.hotelId] = {
          isDeal:        h.isDeal,
          discountPct:   h.discountPct > 0 ? String(h.discountPct) : "",
          originalPrice: h.originalPrice ? String(h.originalPrice) : "",
        };
      });
      setEdits(initEdits);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchHotels(); }, [fetchHotels]);

  const handleToggle = (hotelId: string) => {
    setEdits((prev) => ({
      ...prev,
      [hotelId]: { ...prev[hotelId], isDeal: !prev[hotelId].isDeal },
    }));
    // Clear saved/error state when user makes a change
    setSaved((prev) => ({ ...prev, [hotelId]: false }));
    setErrors((prev) => ({ ...prev, [hotelId]: "" }));
  };

  const handleField = (hotelId: string, field: "discountPct" | "originalPrice", value: string) => {
    setEdits((prev) => ({ ...prev, [hotelId]: { ...prev[hotelId], [field]: value } }));
    setSaved((prev) => ({ ...prev, [hotelId]: false }));
    setErrors((prev) => ({ ...prev, [hotelId]: "" }));
  };

  const handleSave = async (hotelId: string) => {
    const edit = edits[hotelId];
    if (!edit) return;

    const discountPct   = edit.discountPct   ? Number(edit.discountPct)   : 0;
    const originalPrice = edit.originalPrice ? Number(edit.originalPrice) : null;

    if (edit.isDeal && discountPct <= 0) {
      setErrors((prev) => ({ ...prev, [hotelId]: "Discount % must be greater than 0 when marked as a deal." }));
      return;
    }
    if (edit.isDeal && discountPct > 99) {
      setErrors((prev) => ({ ...prev, [hotelId]: "Discount % cannot exceed 99." }));
      return;
    }

    setSaving((prev) => ({ ...prev, [hotelId]: true }));
    setErrors((prev) => ({ ...prev, [hotelId]: "" }));

    try {
      const token = localStorage.getItem("luxe_admin_token");
      const res = await fetch(`${API}/hotels/${hotelId}`, {
        method:  "PATCH",
        headers: {
          "Content-Type":  "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          isDeal:        edit.isDeal,
          discountPct:   edit.isDeal ? discountPct : 0,
          originalPrice: edit.isDeal ? originalPrice : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to save");

      // Update local hotel state
      setHotels((prev) =>
        prev.map((h) =>
          h.hotelId === hotelId
            ? { ...h, isDeal: edit.isDeal, discountPct: edit.isDeal ? discountPct : 0, originalPrice: edit.isDeal ? originalPrice : null }
            : h
        )
      );
      setSaved((prev) => ({ ...prev, [hotelId]: true }));
      setTimeout(() => setSaved((prev) => ({ ...prev, [hotelId]: false })), 3000);
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, [hotelId]: err.message || "Save failed." }));
    }
    setSaving((prev) => ({ ...prev, [hotelId]: false }));
  };

  const activeDeals = hotels.filter((h) => edits[h.hotelId]?.isDeal).length;

  return (
    <AdminLayout>
      <Topbar title="Top Deals" />
      <div className="p-6 space-y-6">
        <PageHeader
          title="Top Deals Management"
          subtitle="Control which hotels appear in the Top Deals carousel on the user-facing Hotels page."
          actions={
            <button
              onClick={() => fetchHotels(true)}
              disabled={refreshing}
              className="flex items-center gap-2 text-sm font-medium text-text-secondary border border-border rounded-lg px-4 py-2 hover:bg-surface-3 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          }
        />

        {/* Summary banner */}
        <div className="flex items-center gap-4 p-4 rounded-xl"
          style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.2)" }}>
          <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0"
            style={{ background: "rgba(212,168,67,0.15)", border: "1px solid rgba(212,168,67,0.3)" }}>
            <Tag className="w-5 h-5 text-gold" />
          </div>
          <div>
            <p className="text-sm font-semibold text-bright">
              {activeDeals} hotel{activeDeals !== 1 ? "s" : ""} currently marked as Top Deal
            </p>
            <p className="text-xs text-dim mt-0.5">
              These appear in the "Top Deals" carousel on the user-facing Hotels page with a discount badge.
            </p>
          </div>
        </div>

        {/* Hotel cards */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : hotels.length === 0 ? (
          <div className="glass-card rounded-2xl p-16 text-center">
            <Tag className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-sm text-dim">No hotels found. Add hotels first.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {hotels.map((hotel) => {
              const edit    = edits[hotel.hotelId];
              const isSaving = saving[hotel.hotelId];
              const isSaved  = saved[hotel.hotelId];
              const errMsg   = errors[hotel.hotelId];
              if (!edit) return null;

              return (
                <div
                  key={hotel.hotelId}
                  className="glass-card rounded-2xl overflow-hidden transition-all"
                  style={{
                    border: edit.isDeal
                      ? "1px solid rgba(212,168,67,0.4)"
                      : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {/* Hotel image */}
                  <div className="relative h-36 overflow-hidden">
                    <img
                      src={hotel.image}
                      alt={hotel.name}
                      className="w-full h-full object-cover"
                    />
                    {/* Deal badge overlay */}
                    {edit.isDeal && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold text-white"
                        style={{ background: "rgba(192,57,43,0.9)" }}>
                        TOP DEAL
                      </div>
                    )}
                    {edit.isDeal && edit.discountPct && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold text-white"
                        style={{ background: "rgba(16,185,129,0.9)" }}>
                        -{edit.discountPct}%
                      </div>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="p-4 space-y-3">
                    <div>
                      <p className="font-semibold text-bright text-sm">{hotel.name}</p>
                      <p className="text-xs text-dim">{hotel.location}</p>
                      <p className="text-xs text-soft mt-0.5">Base price: ${hotel.pricePerNight}/night</p>
                    </div>

                    {/* Toggle */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-soft uppercase tracking-wider">Mark as Top Deal</span>
                      <button
                        type="button"
                        onClick={() => handleToggle(hotel.hotelId)}
                        className="relative w-11 h-6 rounded-full transition-all duration-200 focus:outline-none"
                        style={{
                          background: edit.isDeal ? "#d4a843" : "rgba(255,255,255,0.1)",
                        }}
                        aria-checked={edit.isDeal}
                        role="switch"
                      >
                        <span
                          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
                          style={{ left: edit.isDeal ? "calc(100% - 1.375rem)" : "0.125rem" }}
                        />
                      </button>
                    </div>

                    {/* Discount fields — only shown when isDeal is on */}
                    {edit.isDeal && (
                      <div className="space-y-2 pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                        <div>
                          <label className="block text-[10px] font-bold text-dim uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Percent className="w-3 h-3" /> Discount %
                            <span className="text-danger ml-0.5">*</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="99"
                            value={edit.discountPct}
                            onChange={(e) => handleField(hotel.hotelId, "discountPct", e.target.value)}
                            placeholder="e.g. 20"
                            className="w-full border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-gold bg-white/5 text-bright placeholder:text-dim"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-dim uppercase tracking-wider mb-1">
                            Original Price ($) <span className="text-dim font-normal">(optional — shown crossed out)</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={edit.originalPrice}
                            onChange={(e) => handleField(hotel.hotelId, "originalPrice", e.target.value)}
                            placeholder={`e.g. ${Math.round(hotel.pricePerNight * 1.25)}`}
                            className="w-full border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-gold bg-white/5 text-bright placeholder:text-dim"
                          />
                        </div>
                      </div>
                    )}

                    {/* Error */}
                    {errMsg && (
                      <div className="flex items-center gap-2 text-xs text-danger">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errMsg}
                      </div>
                    )}

                    {/* Save button */}
                    <button
                      type="button"
                      onClick={() => handleSave(hotel.hotelId)}
                      disabled={isSaving}
                      className="w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                      style={{
                        background: isSaved
                          ? "rgba(16,185,129,0.15)"
                          : "rgba(192,57,43,0.9)",
                        color: isSaved ? "#10b981" : "#fff",
                        border: isSaved ? "1px solid rgba(16,185,129,0.3)" : "none",
                        opacity: isSaving ? 0.6 : 1,
                      }}
                    >
                      {isSaving ? (
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : isSaved ? (
                        <><CheckCircle className="w-3.5 h-3.5" /> Saved</>
                      ) : (
                        <><Save className="w-3.5 h-3.5" /> Save Changes</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
