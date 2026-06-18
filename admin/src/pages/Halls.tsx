import { useEffect, useState, useCallback } from "react";
import {
  Plus, Calendar, List, ChevronLeft, ChevronRight,
  Users, Clock, MapPin, Edit2, Trash2, Check,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import Topbar from "@/components/Topbar";
import Modal from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";
import { getManagerHalls, createManagerHall, updateManagerHall, getHotels } from "@/services/api";

type HallEvent = {
  id: string;
  hallId: string;
  hallName: string;
  eventName: string;
  organizer: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:MM
  endTime: string;
  capacity: number;
  status: "Confirmed" | "Pending" | "Cancelled";
  notes?: string;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const emptyForm = {
  hallName: "", eventName: "", organizer: "",
  date: "", startTime: "09:00", endTime: "12:00",
  capacity: "50", status: "Pending", notes: "",
};

const emptyHallForm = {
  name: "", capacity: "100", pricePerDay: "1000",
};

export default function Halls() {
  const [hotels, setHotels] = useState<any[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<string>("");

  const [halls, setHalls]       = useState<any[]>([]);
  const [events, setEvents]     = useState<HallEvent[]>([]);
  const [loading, setLoading]   = useState(true);
  const [view, setView]         = useState<"calendar" | "list">("calendar");
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [showAdd, setShowAdd]   = useState(false);
  const [showAddHall, setShowAddHall] = useState(false);
  const [editEvent, setEditEvent] = useState<HallEvent | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  
  const [form, setForm]         = useState({ ...emptyForm });
  const [hallForm, setHallForm] = useState({ ...emptyHallForm });
  const [success, setSuccess]   = useState(false);

  useEffect(() => {
    getHotels().then((res: any) => {
      const data = res?.data || res?.data?.data || [];
      const actualData = Array.isArray(data) ? data : (data.data || []);
      setHotels(actualData);
      if (actualData.length > 0) {
        setSelectedHotelId(actualData[0]._id || actualData[0].id);
      }
    }).catch(() => {});
  }, []);

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const loadHalls = useCallback(async () => {
    if (!selectedHotelId) return;
    setLoading(true);
    try {
      const res: any = await getManagerHalls({ hotelId: selectedHotelId });
      const data = res?.data || [];
      
      setHalls(data);
      if (data.length > 0) {
        setForm((f) => ({ ...f, hallName: f.hallName || data[0].name }));
      } else {
        setForm((f) => ({ ...f, hallName: "" }));
      }
      
      const allEvents: HallEvent[] = [];
      data.forEach((hall: any) => {
        (hall.bookings || []).forEach((b: any) => {
          allEvents.push({
            id: b._id || b.id,
            hallId: hall._id,
            hallName: hall.name,
            eventName: b.eventName,
            organizer: b.organizer,
            date: b.date ? new Date(b.date).toISOString().split("T")[0] : "",
            startTime: b.startTime,
            endTime: b.endTime,
            capacity: b.capacity,
            status: b.status || "Confirmed",
            notes: b.notes,
          });
        });
      });
      setEvents(allEvents);
    } catch {
      setHalls([]);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [selectedHotelId]);

  useEffect(() => {
    loadHalls();
  }, [loadHalls]);

  const eventsOnDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter((e) => e.date === dateStr);
  };

  const selectedDayEvents = selectedDay ? events.filter((e) => e.date === selectedDay) : [];

  const handleSaveHall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHotelId) return;
    try {
      await createManagerHall({
        name: hallForm.name,
        capacity: Number(hallForm.capacity),
        pricePerDay: Number(hallForm.pricePerDay),
        hotelId: selectedHotelId
      });
      setSuccess(true);
      await loadHalls();
      setTimeout(() => {
        setShowAddHall(false);
        setHallForm({ ...emptyHallForm });
        setSuccess(false);
      }, 1000);
    } catch { /* silent */ }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetHall = halls.find((h) => h.name === form.hallName);
    if (!targetHall) return;

    const payload = {
      eventName: form.eventName,
      organizer: form.organizer,
      date: new Date(form.date),
      startTime: form.startTime,
      endTime: form.endTime,
      capacity: Number(form.capacity),
      status: form.status,
      notes: form.notes,
    };

    try {
      if (editEvent) {
        const currentHall = halls.find((h) => h._id === editEvent.hallId);
        if (currentHall) {
          const updatedBookings = currentHall.bookings.map((b: any) =>
            (b._id === editEvent.id || b.id === editEvent.id) ? { ...b, ...payload } : b
          );
          await updateManagerHall(currentHall._id, { bookings: updatedBookings });
        }
      } else {
        await updateManagerHall(targetHall._id, { booking: payload });
      }
      setSuccess(true);
      await loadHalls();
      setTimeout(() => {
        setShowAdd(false);
        setEditEvent(null);
        setForm({ ...emptyForm, hallName: halls[0]?.name || "" });
        setSuccess(false);
      }, 1000);
    } catch { /* silent */ }
  };

  const handleDelete = async (eventId: string, hallId: string) => {
    const currentHall = halls.find((h) => h._id === hallId);
    if (!currentHall) return;
    try {
      const updatedBookings = currentHall.bookings.filter((b: any) => (b._id !== eventId && b.id !== eventId));
      await updateManagerHall(currentHall._id, { bookings: updatedBookings });
      await loadHalls();
    } catch { /* silent */ }
  };

  const openEdit = (ev: HallEvent) => {
    setEditEvent(ev);
    setForm({
      hallName: ev.hallName, eventName: ev.eventName, organizer: ev.organizer,
      date: ev.date, startTime: ev.startTime, endTime: ev.endTime,
      capacity: String(ev.capacity), status: ev.status, notes: ev.notes || "",
    });
    setSuccess(false);
  };

  const statusDot: Record<string, string> = {
    Confirmed: "bg-success",
    Pending:   "bg-warning",
    Cancelled: "bg-danger",
  };

  return (
    <AdminLayout>
      <Topbar title="Halls & Events" />
      <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Halls & Events</h1>
            <p className="text-sm text-text-secondary mt-0.5">{events.length} events scheduled</p>
          </div>
          {hotels.length > 0 && (
            <select
              value={selectedHotelId}
              onChange={(e) => setSelectedHotelId(e.target.value)}
              className="glass-select border border-border rounded-xl px-3 py-2 text-sm outline-none font-medium ml-4 max-w-[200px]"
            >
              {hotels.map((h: any) => (
                <option key={h._id || h.id} value={h._id || h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-border rounded-xl overflow-hidden bg-surface-2">
            <button
              onClick={() => setView("calendar")}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                view === "calendar" ? "bg-primary " : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
              }`}
            >
              <Calendar className="w-4 h-4" /> Calendar
            </button>
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                view === "list" ? "bg-primary " : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
              }`}
            >
              <List className="w-4 h-4" /> List
            </button>
          </div>
          <button
            onClick={() => { setHallForm({ ...emptyHallForm }); setShowAddHall(true); }}
            className="flex items-center gap-2 bg-surface-3  px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-white/20 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Hall
          </button>
          <button
            onClick={() => { setForm({ ...emptyForm, hallName: halls[0]?.name || "" }); setShowAdd(true); }}
            className="flex items-center gap-2 bg-primary  px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors"
            disabled={halls.length === 0}
            title={halls.length === 0 ? "Add a hall first" : ""}
          >
            <Plus className="w-4 h-4" /> Book Hall
          </button>
        </div>
      </div>

      {view === "calendar" ? (
        <div className="grid lg:grid-cols-[1fr_320px] gap-4">
          {/* Calendar */}
          <div className="bg-white shadow-card rounded-2xl border border-border p-5">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-5">
              <button onClick={prevMonth} className="w-8 h-8 rounded-xl flex items-center justify-center text-text-secondary hover:bg-surface-3 hover:text-text-primary transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="font-bold text-text-primary">{MONTHS_FULL[month]} {year}</h2>
              <button onClick={nextMonth} className="w-8 h-8 rounded-xl flex items-center justify-center text-text-secondary hover:bg-surface-3 hover:text-text-primary transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-text-secondary py-1">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayEvents = eventsOnDay(day);
                const isSelected = selectedDay === dateStr;
                const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                    className={`relative min-h-[52px] rounded-xl p-1.5 text-left transition-all ${
                      isSelected
                        ? "bg-primary "
                        : isToday
                        ? "border border-gold/40 bg-gold/10"
                        : "hover:bg-surface-2"
                    }`}
                  >
                    <span className={`text-xs font-semibold block mb-1 ${
                      isSelected ? "" : isToday ? "text-gold" : "text-text-primary"
                    }`}>
                      {day}
                    </span>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          className={`w-full h-1.5 rounded-full ${statusDot[ev.status]}`}
                        />
                      ))}
                      {dayEvents.length > 2 && (
                        <span className={`text-[9px] font-bold ${isSelected ? "/70" : "text-text-secondary"}`}>
                          +{dayEvents.length - 2}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              {[["Confirmed", "bg-success"], ["Pending", "bg-warning"], ["Cancelled", "bg-danger"]].map(([label, color]) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Day detail panel */}
          <div className="bg-white shadow-card rounded-2xl border border-border p-5">
            {selectedDay ? (
              <>
                <h3 className="font-semibold text-text-primary mb-1">
                  {new Date(selectedDay + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </h3>
                <p className="text-xs text-text-secondary mb-4">{selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? "s" : ""}</p>
                {selectedDayEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-8 h-8 /10 mx-auto mb-2" />
                    <p className="text-sm text-text-secondary">No events this day</p>
                    <button
                      onClick={() => { setForm({ ...emptyForm, date: selectedDay }); setShowAdd(true); }}
                      className="mt-3 text-xs text-gold font-semibold hover:underline"
                      disabled={halls.length === 0}
                    >
                      + Book a hall
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDayEvents.map((ev) => (
                      <div key={ev.id} className="rounded-xl p-3"
                        style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-semibold text-text-primary text-sm">{ev.eventName}</p>
                          <StatusBadge status={ev.status} />
                        </div>
                        <div className="space-y-1 text-xs text-text-secondary">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-gold" /> {ev.hallName}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-gold" /> {ev.startTime} – {ev.endTime}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3 h-3 text-gold" /> {ev.capacity} guests · {ev.organizer}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => openEdit(ev)}
                            className="flex-1 flex items-center justify-center gap-1 text-xs font-medium text-soft border border-border rounded-lg py-1.5 hover:bg-surface-2 hover:text-text-primary transition-colors">
                            <Edit2 className="w-3 h-3" /> Edit
                          </button>
                          <button onClick={() => handleDelete(ev.id, ev.hallId)}
                            className="flex items-center justify-center w-7 h-7 text-danger border border-danger/20 rounded-lg hover:bg-danger/10 transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Calendar className="w-10 h-10 /10 mx-auto mb-3" />
                <p className="text-sm text-text-secondary">Select a day to view events</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="bg-white shadow-card rounded-2xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.04)" }}>
                {["Event", "Hall", "Date", "Time", "Capacity", "Organizer", "Status", ""].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wider px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.sort((a, b) => a.date.localeCompare(b.date)).map((ev) => (
                <tr key={ev.id} className="transition-colors"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                  <td className="px-5 py-3.5 font-medium text-text-primary text-sm">{ev.eventName}</td>
                  <td className="px-5 py-3.5 text-sm text-soft">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gold" /> {ev.hallName}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-soft">
                    {new Date(ev.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-soft">{ev.startTime} – {ev.endTime}</td>
                  <td className="px-5 py-3.5 text-sm text-soft">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-gold" /> {ev.capacity}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-soft">{ev.organizer}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={ev.status} /></td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openEdit(ev)}
                        className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-3 rounded-lg transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(ev.id, ev.hallId)}
                        className="p-1.5 text-danger hover:bg-danger/10 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-text-secondary">No events found for this hotel.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Hall Modal */}
      <Modal
        isOpen={showAddHall}
        onClose={() => { setShowAddHall(false); setSuccess(false); }}
        title="Add New Hall"
        size="md"
      >
        {success ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="w-12 h-12 rounded-full grid place-items-center"
              style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
              <Check className="w-6 h-6 text-success" />
            </div>
            <p className="font-semibold text-text-primary">Hall Added!</p>
          </div>
        ) : (
          <form onSubmit={handleSaveHall} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Hall Name *</label>
              <input required value={hallForm.name} onChange={(e) => setHallForm({ ...hallForm, name: e.target.value })}
                placeholder="e.g. Grand Ballroom"
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold bg-surface-2 text-text-primary placeholder:text-text-secondary" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Capacity</label>
                <input required type="number" min="1" value={hallForm.capacity} onChange={(e) => setHallForm({ ...hallForm, capacity: e.target.value })}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold bg-surface-2 text-text-primary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Price / Day</label>
                <input required type="number" min="0" value={hallForm.pricePerDay} onChange={(e) => setHallForm({ ...hallForm, pricePerDay: e.target.value })}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold bg-surface-2 text-text-primary" />
              </div>
            </div>
            <button type="submit"
              className="w-full bg-surface-3  py-3 rounded-xl font-semibold text-sm hover:bg-white/20 transition-colors">
              Add Hall
            </button>
          </form>
        )}
      </Modal>

      {/* Add / Edit Event Modal */}
      <Modal
        isOpen={showAdd || !!editEvent}
        onClose={() => { setShowAdd(false); setEditEvent(null); setSuccess(false); }}
        title={editEvent ? "Edit Event" : "Book a Hall"}
        size="md"
      >
        {success ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="w-12 h-12 rounded-full grid place-items-center"
              style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
              <Check className="w-6 h-6 text-success" />
            </div>
            <p className="font-semibold text-text-primary">Event saved!</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Event Name *</label>
                <input required value={form.eventName} onChange={(e) => setForm({ ...form, eventName: e.target.value })}
                  placeholder="e.g. Wedding Reception"
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold bg-surface-2 text-text-primary placeholder:text-text-secondary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Hall *</label>
                <select value={form.hallName} onChange={(e) => setForm({ ...form, hallName: e.target.value })}
                  className="w-full glass-select border border-border rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
                  required>
                  {halls.map((h: any) => <option key={h._id} value={h.name} className="text-black">{h.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Organizer *</label>
                <input required value={form.organizer} onChange={(e) => setForm({ ...form, organizer: e.target.value })}
                  placeholder="Name or company"
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold bg-surface-2 text-text-primary placeholder:text-text-secondary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Date *</label>
                <input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold bg-surface-2 text-text-primary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Capacity</label>
                <input type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold bg-surface-2 text-text-primary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Start Time</label>
                <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold bg-surface-2 text-text-primary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">End Time</label>
                <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold bg-surface-2 text-text-primary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full glass-select border border-border rounded-xl px-3 py-2.5 text-sm outline-none bg-white">
                  <option className="text-black">Pending</option>
                  <option className="text-black">Confirmed</option>
                  <option className="text-black">Cancelled</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2} placeholder="Additional notes..."
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold bg-surface-2 text-text-primary placeholder:text-text-secondary resize-none" />
              </div>
            </div>
            <button type="submit"
              className="w-full bg-primary  py-3 rounded-xl font-semibold text-sm hover:bg-primary-dark transition-colors">
              {editEvent ? "Save Changes" : "Book Hall"}
            </button>
          </form>
        )}
      </Modal>
      </div>
    </AdminLayout>
  );
}
