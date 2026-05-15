import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, BedDouble, CalendarCheck, DollarSign, TrendingUp, MapPin } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import Topbar from "@/components/Topbar";
import StatsCard from "@/components/StatsCard";
import StatusBadge from "@/components/StatusBadge";
import { useHotels } from "@/context/HotelsContext";
import { useBookings } from "@/context/BookingsContext";
import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function HotelDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hotels } = useHotels();
  const { bookings } = useBookings();

  const [hotelRooms, setHotelRooms] = useState<any[]>([]);
  const hotel = hotels.find((h) => h.hotelId === id || String(h.id) === id);

  useEffect(() => {
    if (!hotel) return;
    fetch(`${API}/hotels/${hotel.hotelId}`)
      .then((r) => r.json())
      .then((d) => setHotelRooms(d?.data?.rooms || []))
      .catch(() => {});
  }, [hotel?.hotelId]);

  if (!hotel) {
    return (
      <AdminLayout>
        <Topbar title="Hotel Detail" />
        <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-text-secondary text-lg font-semibold">Hotel not found.</p>
          <button onClick={() => navigate("/hotels")}
            className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
            <ArrowLeft className="w-4 h-4" /> Back to Hotels
          </button>
        </div>
      </AdminLayout>
    );
  }

  // Match bookings by hotel name OR by room number prefix (initials or legacy h1_r1 format)
  const hotelBookings = bookings.filter((b) => {
    if (b.property === hotel.name) return true;
    const roomNum = b.room?.roomNumber || "";
    // initials format: "hdl-101" → "hdl"
    const prefix = roomNum.split("-")[0]?.toLowerCase();
    // legacy format: "h1_r1" → "h1"
    const legacyPrefix = roomNum.split("_")[0]?.toLowerCase();
    // Build expected initials from hotel name
    const initials = hotel.name
      .replace(/[^a-zA-Z\s]/g, "")
      .split(/\s+/).filter(Boolean)
      .map((w: string) => w[0].toLowerCase()).join("");
    return prefix === initials || legacyPrefix === hotel.hotelId;
  });
  const revenue       = hotelBookings.reduce((s, b) => s + b.totalAmount, 0);
  const confirmed     = hotelBookings.filter((b) => b.status === "Confirmed").length;
  const pending       = hotelBookings.filter((b) => b.status === "Pending").length;

  const availableRooms = hotelRooms.filter((r) => (r.available ?? 1) > 0).length;
  const occupancyPct   = hotelRooms.length
    ? Math.round(((hotelRooms.length - availableRooms) / hotelRooms.length) * 100)
    : hotel.activeBookings > 0 ? Math.round((hotel.activeBookings / hotel.rooms) * 100) : 0;

  return (
    <AdminLayout>
      <Topbar title={hotel.name} />
      <div className="p-6 space-y-6">

        {/* Back + Header */}
        <div>
          <button onClick={() => navigate("/hotels")}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-text-primary mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Hotels
          </button>

          <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
            <div className="relative h-40 bg-surface-3">
              <img src={hotel.img.replace("w=60", "w=800")} alt={hotel.name}
                className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-5 text-white">
                <h1 className="text-xl font-bold">{hotel.name}</h1>
                <p className="text-sm text-white/70 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" /> {hotel.location}, {hotel.country}
                </p>
              </div>
              <div className="absolute top-4 right-4">
                <StatusBadge status={hotel.status} />
              </div>
            </div>
            <div className="px-5 py-3 flex items-center gap-4 text-sm text-muted border-t border-border">
              <span>{hotel.subtitle}</span>
              <span>·</span>
              <span>{hotel.rooms} total rooms</span>
              <span>·</span>
              <span>{occupancyPct}% occupancy</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Total Bookings" value={hotelBookings.length} change={`${confirmed} confirmed`} trend="up"
            icon={<CalendarCheck className="w-5 h-5 text-primary" />} iconBg="bg-primary-light" />
          <StatsCard title="Pending" value={pending} change="Needs action" trend={pending > 0 ? "down" : "neutral"}
            icon={<TrendingUp className="w-5 h-5 text-warning" />} iconBg="bg-warning-light" />
          <StatsCard title="Revenue" value={`$${revenue.toLocaleString()}`} change="From bookings" trend="up"
            icon={<DollarSign className="w-5 h-5 text-success" />} iconBg="bg-success-light" />
          <StatsCard title="Rooms" value={hotelRooms.length || hotel.rooms} change={`${availableRooms || hotel.rooms - hotel.activeBookings} available`}
            icon={<BedDouble className="w-5 h-5 text-text-secondary" />} iconBg="bg-surface-3" />
        </div>

        {/* Rooms table */}
        <div className="bg-white rounded-xl border border-border shadow-card">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-text-primary">Rooms</h3>
            <p className="text-xs text-muted mt-0.5">All rooms assigned to {hotel.name}</p>
          </div>
          {hotelRooms.length === 0 ? (
            <div className="px-5 py-10 text-center text-muted text-sm">
              No rooms found for this hotel. Add rooms from the{" "}
              <button onClick={() => navigate("/rooms")} className="text-primary hover:underline font-semibold">
                Rooms page
              </button>.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Room ID", "Name", "Price/Night", "Capacity", "Bed", "Status"].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hotelRooms.map((r) => (
                    <tr key={r.id || r._id} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-semibold text-text-primary">{r.id || r._id}</td>
                      <td className="px-5 py-3.5 text-sm text-text-secondary">{r.name}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-text-primary">${r.price}</td>
                      <td className="px-5 py-3.5 text-sm text-text-secondary">{r.capacity}</td>
                      <td className="px-5 py-3.5 text-sm text-text-secondary">{r.bed || "—"}</td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={(r.available ?? 1) > 0 ? "Available" : "Booked"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bookings table */}
        <div className="bg-white rounded-xl border border-border shadow-card">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-text-primary">Bookings</h3>
            <p className="text-xs text-muted mt-0.5">All reservations at {hotel.name}</p>
          </div>
          {hotelBookings.length === 0 ? (
            <div className="px-5 py-10 text-center text-muted text-sm">
              No bookings yet for this hotel.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Booking ID", "Guest", "Room Type", "Check-in", "Check-out", "Nights", "Amount", "Status"].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hotelBookings.map((b) => (
                    <tr key={b.id} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-semibold text-primary">#{b.id}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary-light grid place-items-center shrink-0">
                            <span className="text-primary text-xs font-bold">{b.guestSnapshot.name.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-text-primary">{b.guestSnapshot.name}</p>
                            <p className="text-xs text-muted">{b.guestSnapshot.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-text-secondary">{b.room.type}</td>
                      <td className="px-5 py-3.5 text-xs text-text-secondary">
                        {new Date(b.checkIn).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-text-secondary">
                        {new Date(b.checkOut).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-text-secondary">{b.nights}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-text-primary">${b.totalAmount.toLocaleString()}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={b.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  );
}
