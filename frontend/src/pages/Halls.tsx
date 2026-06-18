import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Calendar, Clock, Users, Check, Loader2, ArrowRight, Mail, UserCircle, CheckCircle2 } from "lucide-react";
import Layout from "@/components/Layout";
import { useBooking } from "@/context/BookingContext";
import { getHotelHalls, bookHotelHall } from "@/services/api";
import socket from "@/services/socket";
import { AuthModal } from "@/components/AuthModal";
import { toast } from "sonner";

type Hall = {
  _id: string;
  name: string;
  description?: string;
  capacity: number;
  pricePerHour?: number;
  pricePerDay?: number;
  amenities?: string[];
  isActive?: boolean;
};

type HallBookingForm = {
  eventName: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: string;
  notes: string;
};

const defaultForm: HallBookingForm = {
  eventName: "",
  date: "",
  startTime: "",
  endTime: "",
  capacity: "", 
  notes: "",
};

const Halls = () => {
  const navigate = useNavigate();
  const { hotels, user } = useBooking();
  const [selectedHotelId, setSelectedHotelId] = useState<string>(hotels[0]?.id || "");
  const [halls, setHalls] = useState<Hall[]>([]);
  const [hallLoading, setHallLoading] = useState(false);
  const [selectedHallId, setSelectedHallId] = useState<string>("");
  const [form, setForm] = useState<HallBookingForm>(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  const selectedHotel = hotels.find((hotel) => hotel.id === selectedHotelId) || hotels[0] || null;

  useEffect(() => {
    if (!selectedHotelId && hotels.length > 0) {
      setSelectedHotelId(hotels[0].id);
    }
  }, [hotels, selectedHotelId]);

  useEffect(() => {
    const loadHalls = async () => {
      if (!selectedHotelId) {
        setHalls([]);
        return;
      }
      setHallLoading(true);
      setHalls([]);
      setSelectedHallId("");
      try {
        const response = await getHotelHalls(selectedHotelId);
        const data = response?.data;
        const hallsArray = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
        setHalls(hallsArray);
      } catch (error: any) {
        console.error("Failed to load halls", error);
        toast.error("Unable to load halls right now.");
      } finally {
        setHallLoading(false);
      }
    };

    loadHalls();

    const handleHallsUpdated = () => {
      loadHalls();
    };

    socket.on("hallsUpdated", handleHallsUpdated);

    return () => {
      socket.off("hallsUpdated", handleHallsUpdated);
    };
  }, [selectedHotelId]);

  const openAuth = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const handleFormChange = (field: keyof HallBookingForm, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmitRequest = async () => {
    if (!selectedHotel || !selectedHallId) {
      toast.error("Select a hotel and hall first.");
      return;
    }
    if (!user) {
      openAuth("signin");
      return;
    }

    const validation: Record<string, string> = {};
    if (!form.eventName.trim()) validation.eventName = "Event name is required.";
    if (!form.date) validation.date = "Date is required.";
    if (!form.startTime) validation.startTime = "Start time is required.";
    if (!form.endTime) validation.endTime = "End time is required.";
    if (!form.capacity || parseInt(form.capacity) < 1) validation.capacity = "Capacity must be at least 1.";
    if (form.startTime && form.endTime && form.startTime >= form.endTime) validation.endTime = "End time must be after start time.";

    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    setSubmitting(true);
    try {
      await bookHotelHall(selectedHotel.id, selectedHallId, {
        eventName: form.eventName,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        capacity: Number(form.capacity),
        notes: form.notes,
        organizer: user?.name,
        organizerEmail: user?.email,
        userId: user?.id,
        status: "Pending" as const,
      });
      toast.success("Hall booking request submitted successfully.");
      setForm(defaultForm);
      setSelectedHallId("");
    } catch (err: any) {
      if (err.status === 401) {
        openAuth("signin");
      }
      toast.error(err.message || "Unable to submit the hall booking request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="container py-10 max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground mb-2">Event Halls</p>
            <h1 className="font-display text-3xl md:text-4xl font-bold">Book a function hall</h1>
            <p className="max-w-2xl text-muted-foreground mt-3">
              Request a hall booking for your upcoming event. Choose a hotel, select an available hall, and send a booking request directly to the hotel manager.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-primary shadow-sm transition-base hover:bg-secondary"
          >
            <UserCircle className="w-4 h-4" />
            Back to profile
          </button>
        </div>

        {!user ? (
          <div className="rounded-3xl border border-border bg-card p-10 text-center">
            <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full bg-accent/10 text-accent">
              <Building2 className="w-10 h-10" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-3">Sign in to request a hall booking</h2>
            <p className="text-muted-foreground mb-6">Only signed in guests can submit function hall booking requests.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button
                onClick={() => openAuth("signin")}
                className="inline-flex items-center justify-center rounded-2xl bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-base hover:bg-accent/90"
              >
                Sign In
              </button>
              <button
                onClick={() => openAuth("signup")}
                className="inline-flex items-center justify-center rounded-2xl border border-border bg-card px-6 py-3 text-sm font-semibold text-primary transition-base hover:bg-secondary"
              >
                Create account
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-8 xl:grid-cols-[320px_1fr]">
            <section className="space-y-6 rounded-3xl border border-border bg-card p-6">
              <div>
                <h2 className="font-semibold text-xl text-primary">Select hotel</h2>
                <p className="text-sm text-muted-foreground mt-1">Choose the hotel where you want to request a hall.</p>
              </div>

              {hotels.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-border bg-secondary/40 p-6 text-center text-muted-foreground">
                  No hotels are currently loaded. Please visit the hotels page and refresh the listings.
                </div>
              ) : (
                <select
                  value={selectedHotelId}
                  onChange={(e) => setSelectedHotelId(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                >
                  {hotels.map((hotel) => (
                    <option key={hotel.id} value={hotel.id}>{hotel.name} — {hotel.location}</option>
                  ))}
                </select>
              )}

              <div className="rounded-3xl border border-border bg-secondary/30 p-4">
                <p className="text-sm text-muted-foreground">Recommended</p>
                <p className="mt-2 text-sm text-primary">If you need help, contact support through your profile to get assistance with event logistics.</p>
              </div>
            </section>

            <section className="space-y-6">
              <div className="rounded-3xl border border-border bg-card p-6">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <h2 className="font-semibold text-xl text-primary">Available halls</h2>
                    <p className="text-sm text-muted-foreground mt-1">Select a hall to request a booking.</p>
                  </div>
                </div>

                {hallLoading ? (
                  <div className="rounded-3xl border border-border p-10 text-center text-muted-foreground">
                    <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-accent" />
                    Loading halls…
                  </div>
                ) : halls.length === 0 ? (
                  <div className="rounded-3xl border border-border p-10 text-center text-muted-foreground">
                    No halls are available for this hotel.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {halls.map((hall) => (
                      <button
                        key={hall._id}
                        type="button"
                        onClick={() => setSelectedHallId(selectedHallId === hall._id ? "" : hall._id)}
                        className={`w-full rounded-3xl border p-5 text-left transition-base relative overflow-hidden ${selectedHallId === hall._id ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-border bg-background hover:border-accent hover:bg-secondary/80"}`}
                      >
                        {selectedHallId === hall._id && (
                          <div className="absolute top-5 right-5 text-accent animate-in zoom-in duration-200">
                            <CheckCircle2 className="w-5 h-5 fill-accent text-white" />
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-lg text-primary">{hall.name}</h3>
                            <p className="text-sm text-muted-foreground mt-1">Up to {hall.capacity} guests</p>
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            <div>{hall.pricePerDay ? `₹${hall.pricePerDay}/day` : hall.pricePerHour ? `₹${hall.pricePerHour}/hr` : "Pricing on request"}</div>
                          </div>
                        </div>
                        {hall.description && <p className="mt-4 text-sm text-muted-foreground">{hall.description}</p>}
                        {hall.amenities?.length ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {hall.amenities.map((amenity) => (
                              <span key={amenity} className="rounded-full bg-secondary px-3 py-1 text-xs text-primary">{amenity}</span>
                            ))}
                          </div>
                        ) : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-border bg-card p-6">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <h2 className="font-semibold text-xl text-primary">Request booking</h2>
                    <p className="text-sm text-muted-foreground mt-1">Submit your event details for manager approval.</p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" /> {selectedHotel?.name || "No hotel selected"}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span>Event name</span>
                    <input
                      value={form.eventName}
                      onChange={(e) => handleFormChange("eventName", e.target.value)}
                      placeholder="Wedding, conference, party"
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    />
                    {errors.eventName && <p className="text-xs text-destructive">{errors.eventName}</p>}
                  </label>
                  <label className="space-y-2 text-sm">
                    <span>Date</span>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => handleFormChange("date", e.target.value)}
                      min={new Date().toISOString().slice(0, 10)}
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    />
                    {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
                  </label>
                  <label className="space-y-2 text-sm">
                    <span>Start time</span>
                    <input
                      type="time"
                      value={form.startTime}
                      onChange={(e) => handleFormChange("startTime", e.target.value)}
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    />
                    {errors.startTime && <p className="text-xs text-destructive">{errors.startTime}</p>}
                  </label>
                  <label className="space-y-2 text-sm">
                    <span>End time</span>
                    <input
                      type="time"
                      value={form.endTime}
                      onChange={(e) => handleFormChange("endTime", e.target.value)}
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    />
                    {errors.endTime && <p className="text-xs text-destructive">{errors.endTime}</p>}
                  </label>
                  <label className="space-y-2 text-sm">
                    <span>Capacity</span>
                    <input
                      type="number"
                      min={1}
                      value={form.capacity}
                      onChange={(e) => {
                        const val = e.target.value.replace(/^0+/, "");
                        handleFormChange("capacity", val ? Number(val) : "");
                      }}
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    />
                    {errors.capacity && <p className="text-xs text-destructive">{errors.capacity}</p>}
                  </label>
                  <label className="sm:col-span-2 space-y-2 text-sm">
                    <span>Additional notes</span>
                    <textarea
                      rows={4}
                      value={form.notes}
                      onChange={(e) => handleFormChange("notes", e.target.value)}
                      placeholder="Tell us about your event, catering or seating requirements"
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
                    />
                  </label>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Selected hall: {halls.find((hall) => hall._id === selectedHallId)?.name || "None"}
                  </p>
                  <button
                    type="button"
                    disabled={!selectedHallId || submitting}
                    onClick={handleSubmitRequest}
                    className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-base hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Requesting...</>
                    ) : (
                      <><ArrowRight className="w-4 h-4 mr-2" /> Submit request</>
                    )}
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} defaultMode={authMode} />
    </Layout>
  );
};

export default Halls;
