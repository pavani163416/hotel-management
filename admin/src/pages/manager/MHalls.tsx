import { useState } from "react";
import {
  Plus, Calendar, List, ChevronLeft, ChevronRight,
  Users, Clock, MapPin, Edit2, Trash2, Check,
} from "lucide-react";
import ManagerLayout from "@/components/ManagerLayout";
import Modal from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";

type HallEvent = {
  id: string;
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

const HALLS = ["Grand Ballroom", "Crystal Hall", "Garden Pavilion", "Boardroom A", "Boardroom B"];

const DEMO_EVENTS: HallEvent[] = [
  { id: "1", hallName: "Grand Ballroom",   eventName: "Wedding Reception",   organizer: "Sarah & James",  date: "2026-04-30", startTime: "18:00", endTime: "23:00", capacity: 200, status: "Confirmed" },
  { id: "2", hallName: "Crystal Hall",     eventName: "Corporate Gala",      organizer: "TechCorp Inc.",  date: "2026-05-02", startTime: "19:00", endTime: "22:00", capacity: 150, status: "Confirmed" },
  { id: "3", hallName: "Garden Pavilion",  eventName: "Birthday Celebration", organizer: "Emily Chen",    date: "2026-05-05", startTime: "14:00", endTime: "18:00", capacity: 80,  status: "Pending" },
  { id: "4", hallName: "Boardroom A",      eventName: "Strategy Meeting",    organizer: "Luxe Hotels",    date: "2026-05-07", startTime: "09:00", endTime: "12:00", capacity: 20,  status: "Confirmed" },
  { id: "5", hallName: "Grand Ballroom",   eventName: "Annual Conference",   organizer: "Global Summit",  date: "2026-05-10", startTime: "08:00", endTime: "17:00", capacity: 300, status: "Pending" },
  { id: "6", hallName: "Crystal Hall",     eventName: "Product Launch",      organizer: "StartupXYZ",     date: "2026-05-15", startTime: "10:00", endTime: "14:00", capacity: 100, status: "Confirmed" },
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const emptyForm = {
  hallName: HALLS[0], eventName: "", organizer: "",
  date: "", startTime: "09:00", endTime: "12:00",
  capacity: "50", status: "Pending", notes: "",
};

export default function Halls() {
  const [events, setEvents]     = useState<HallEvent[]>(DEMO_EVENTS);
  const [view, setView]         = useState<"calendar" | "list">("calendar");
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 1)); // May 2026
  const [showAdd, setShowAdd]   = useState(false);
  const [editEvent, setEditEvent] = useState<HallEvent | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [form, setForm]         = useState({ ...emptyForm });
  const [success, setSuccess]   = useState(false);

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const eventsOnDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter((e) => e.date === dateStr);
  };

  const selectedDayEvents = selectedDay ? events.filter((e) => e.date === selectedDay) : [];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: HallEvent = {
      id:        editEvent?.id || Date.now().toString(),
      hallName:  form.hallName,
      eventName: form.eventName,
      organizer: form.organizer,
      date:      form.date,
      startTime: form.startTime,
      endTime:   form.endTime,
      capacity:  Number(form.capacity),
      status:    form.status as HallEvent["status"],
      notes:     form.notes,
    };
    if (editEvent) {
      setEvents((prev) => prev.map((ev) => ev.id === editEvent.id ? payload : ev));
    } else {
      setEvents((prev) => [...prev, payload]);
    }
    setSuccess(true);
    setTimeout(() => {
      setShowAdd(false); setEditEvent(null);
      setForm({ ...emptyForm }); setSuccess(false);
    }, 1000);
  };

  const handleDelete = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const openEdit = (ev: HallEvent) => {
    setEditEvent(ev);
    setForm({
      hallName: ev.hallName, eventName: ev.eventName, organizer: ev.organizer,
      date: ev.date, startTime: ev.startTime, endTime: ev.endTime,
      capacity: String(ev.capacity), status: ev.status, notes: ev.notes || "",
    });
    setSuccess(false);
    // showAdd drives the modal open when editEvent is set — no extra flag needed
  };

  const statusDot: Record<string, string> = {
    Confirmed: "bg-success",
    Pending:   "bg-warning",
    Cancelled: "bg-danger",
  };

  return (
    <ManagerLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-bright">Halls & Events</h1>
          <p className="text-sm text-dim mt-0.5">{events.length} events scheduled</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-white/10 rounded-xl overflow-hidden bg-white/5">
            <button
              onClick={() => setView("calendar")}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                view === "calendar" ? "bg-primary text-white" : "text-dim hover:text-bright hover:bg-white/5"
              }`}
            >
              <Calendar className="w-4 h-4" /> Calendar
            </button>
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                view === "list" ? "bg-primary text-white" : "text-dim hover:text-bright hover:bg-white/5"
              }`}
            >
              <List className="w-4 h-4" /> List
            </button>
          </div>
          <button
            onClick={() => { setForm({ ...emptyForm }); setShowAdd(true); }}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors"
          >
            <Plus className="w-4 h-4" /> Book Hall
          </button>
        </div>
      </div>

      {view === "calendar" ? (
        <div className="grid lg:grid-cols-[1fr_320px] gap-4">
          {/* Calendar */}
          <div className="glass-card rounded-2xl border border-white/10 p-5">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-5">
              <button onClick={prevMonth} className="w-8 h-8 rounded-xl flex items-center justify-center text-dim hover:bg-white/10 hover:text-bright transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="font-bold text-bright">{MONTHS_FULL[month]} {year}</h2>
              <button onClick={nextMonth} className="w-8 h-8 rounded-xl flex items-center justify-center text-dim hover:bg-white/10 hover:text-bright transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-dim py-1">{d}</div>
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
                        ? "bg-primary text-white"
                        : isToday
                        ? "border border-gold/40 bg-gold/10"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <span className={`text-xs font-semibold block mb-1 ${
                      isSelected ? "text-white" : isToday ? "text-gold" : "text-bright"
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
                        <span className={`text-[9px] font-bold ${isSelected ? "text-white/70" : "text-dim"}`}>
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
                <div key={label} className="flex items-center gap-1.5 text-xs text-dim">
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Day detail panel */}
          <div className="glass-card rounded-2xl border border-white/10 p-5">
            {selectedDay ? (
              <>
                <h3 className="font-semibold text-bright mb-1">
                  {new Date(selectedDay + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </h3>
                <p className="text-xs text-dim mb-4">{selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? "s" : ""}</p>
                {selectedDayEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-8 h-8 text-white/10 mx-auto mb-2" />
                    <p className="text-sm text-dim">No events this day</p>
                    <button
                      onClick={() => { setForm({ ...emptyForm, date: selectedDay }); setShowAdd(true); }}
                      className="mt-3 text-xs text-gold font-semibold hover:underline"
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
                          <p className="font-semibold text-bright text-sm">{ev.eventName}</p>
                          <StatusBadge status={ev.status} />
                        </div>
                        <div className="space-y-1 text-xs text-dim">
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
                            className="flex-1 flex items-center justify-center gap-1 text-xs font-medium text-soft border border-white/10 rounded-lg py-1.5 hover:bg-white/5 hover:text-bright transition-colors">
                            <Edit2 className="w-3 h-3" /> Edit
                          </button>
                          <button onClick={() => handleDelete(ev.id)}
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
                <Calendar className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="text-sm text-dim">Select a day to view events</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.04)" }}>
                {["Event", "Hall", "Date", "Time", "Capacity", "Organizer", "Status", ""].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-dim uppercase tracking-wider px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.sort((a, b) => a.date.localeCompare(b.date)).map((ev) => (
                <tr key={ev.id} className="transition-colors"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                  <td className="px-5 py-3.5 font-medium text-bright text-sm">{ev.eventName}</td>
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
                        className="p-1.5 text-dim hover:text-bright hover:bg-white/10 rounded-lg transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(ev.id)}
                        className="p-1.5 text-danger hover:bg-danger/10 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
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
            <p className="font-semibold text-bright">Event saved!</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-dim uppercase tracking-wider mb-1">Event Name *</label>
                <input required value={form.eventName} onChange={(e) => setForm({ ...form, eventName: e.target.value })}
                  placeholder="e.g. Wedding Reception"
                  className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold bg-white/5 text-bright placeholder:text-dim" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-dim uppercase tracking-wider mb-1">Hall *</label>
                <select value={form.hallName} onChange={(e) => setForm({ ...form, hallName: e.target.value })}
                  className="w-full glass-select border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none">
                  {HALLS.map((h) => <option key={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-dim uppercase tracking-wider mb-1">Organizer *</label>
                <input required value={form.organizer} onChange={(e) => setForm({ ...form, organizer: e.target.value })}
                  placeholder="Name or company"
                  className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold bg-white/5 text-bright placeholder:text-dim" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-dim uppercase tracking-wider mb-1">Date *</label>
                <input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold bg-white/5 text-bright" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-dim uppercase tracking-wider mb-1">Capacity</label>
                <input type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold bg-white/5 text-bright" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-dim uppercase tracking-wider mb-1">Start Time</label>
                <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold bg-white/5 text-bright" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-dim uppercase tracking-wider mb-1">End Time</label>
                <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold bg-white/5 text-bright" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-dim uppercase tracking-wider mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full glass-select border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none">
                  <option>Pending</option>
                  <option>Confirmed</option>
                  <option>Cancelled</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-dim uppercase tracking-wider mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2} placeholder="Additional notes..."
                  className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold bg-white/5 text-bright placeholder:text-dim resize-none" />
              </div>
            </div>
            <button type="submit"
              className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-sm hover:bg-primary-dark transition-colors">
              {editEvent ? "Save Changes" : "Book Hall"}
            </button>
          </form>
        )}
      </Modal>
    </ManagerLayout>
  );
}
