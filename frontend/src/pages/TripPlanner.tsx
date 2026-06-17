import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { Loader2, Calendar as CalendarIcon, MapPin, Clock, Plus, Trash2, Utensils, Mountain, Plane, Coffee, ChevronLeft, CheckCircle2 } from "lucide-react";
import { API } from "@/services/api";
import dayjs from "dayjs";
import { toast } from "sonner";

interface Activity {
  _id?: string;
  time: string;
  type: string;
  title: string;
  description: string;
  location: string;
  cost: number;
  isCompleted: boolean;
}

interface TripDay {
  date: string;
  activities: Activity[];
}

interface TripPlan {
  _id: string;
  bookingId: string;
  title: string;
  days: TripDay[];
}

export default function TripPlanner() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDateIndex, setActiveDateIndex] = useState(0);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formState, setFormState] = useState<Activity>({
    time: "10:00 AM", type: "Sightseeing", title: "", description: "", location: "", cost: 0, isCompleted: false
  });
  const [saving, setSaving] = useState(false);

  const fetchTripPlan = async () => {
    try {
      const res = await API.get(`/trip-plans/${bookingId}`);
      if (res.data.success) {
        setTripPlan(res.data.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load itinerary");
      if (err.response?.status === 404 || err.response?.status === 403) {
        navigate("/history");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bookingId) fetchTripPlan();
  }, [bookingId]);

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripPlan) return;
    setSaving(true);
    try {
      const activeDate = tripPlan.days[activeDateIndex].date;
      await API.post(`/trip-plans/${tripPlan._id}/activity`, {
        date: activeDate,
        ...formState
      });
      toast.success("Activity added to your itinerary!");
      setShowForm(false);
      setFormState({ time: "10:00 AM", type: "Sightseeing", title: "", description: "", location: "", cost: 0, isCompleted: false });
      fetchTripPlan();
    } catch (err) {
      toast.error("Failed to add activity");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (activityId: string) => {
    if (!tripPlan) return;
    try {
      const activeDate = tripPlan.days[activeDateIndex].date;
      await API.delete(`/trip-plans/${tripPlan._id}/activity`, {
        data: { date: activeDate, activityId }
      });
      toast.success("Activity removed");
      fetchTripPlan();
    } catch (err) {
      toast.error("Failed to remove activity");
    }
  };

  const toggleComplete = async (act: Activity) => {
    if (!tripPlan) return;
    try {
      const activeDate = tripPlan.days[activeDateIndex].date;
      await API.post(`/trip-plans/${tripPlan._id}/activity`, {
        date: activeDate,
        activityId: act._id,
        isCompleted: !act.isCompleted
      });
      fetchTripPlan();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "Dining": return <Utensils className="w-4 h-4" />;
      case "Sightseeing": return <Mountain className="w-4 h-4" />;
      case "Travel": return <Plane className="w-4 h-4" />;
      case "Other": return <Coffee className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </Layout>
    );
  }

  if (!tripPlan) return null;

  const activeDay = tripPlan.days[activeDateIndex];

  return (
    <Layout>
      <div className="bg-surface-1 min-h-[85vh] py-12">
        <div className="container max-w-5xl">
          
          {/* Header */}
          <div className="mb-8">
            <button 
              onClick={() => navigate("/history")} 
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
            >
              <ChevronLeft className="w-4 h-4" /> Back to My Bookings
            </button>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-display font-bold text-primary">{tripPlan.title}</h1>
                <p className="text-text-secondary mt-1 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  {dayjs(tripPlan.days[0].date).format("MMM D")} - {dayjs(tripPlan.days[tripPlan.days.length-1].date).format("MMM D, YYYY")}
                </p>
              </div>
              <div className="bg-white px-4 py-2 rounded-xl border border-border shadow-sm flex items-center gap-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Days</p>
                  <p className="text-lg font-bold text-primary">{tripPlan.days.length}</p>
                </div>
                <div className="w-px h-8 bg-border"></div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Activities</p>
                  <p className="text-lg font-bold text-primary">{tripPlan.days.reduce((acc, d) => acc + d.activities.length, 0)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-[250px_1fr] gap-8">
            
            {/* Sidebar Days */}
            <div className="space-y-2">
              {tripPlan.days.map((day, idx) => (
                <button
                  key={day.date}
                  onClick={() => {
                    setActiveDateIndex(idx);
                    setShowForm(false);
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                    idx === activeDateIndex 
                      ? "bg-primary text-white shadow-md scale-[1.02]" 
                      : "bg-white text-text-secondary hover:bg-surface-2 border border-border"
                  }`}
                >
                  <div className="text-left">
                    <p className={`text-xs font-bold uppercase tracking-wider ${idx === activeDateIndex ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      Day {idx + 1}
                    </p>
                    <p className="font-semibold">{dayjs(day.date).format("ddd, MMM D")}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    idx === activeDateIndex ? "bg-white text-primary" : "bg-surface-1 text-muted"
                  }`}>
                    {day.activities.length}
                  </div>
                </button>
              ))}
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
              <div className="p-6 border-b border-border bg-surface-1/50 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-primary">
                    Itinerary for {dayjs(activeDay.date).format("MMMM D, YYYY")}
                  </h2>
                </div>
                <button 
                  onClick={() => setShowForm(!showForm)}
                  className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-accent/90 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> {showForm ? "Cancel" : "Add Activity"}
                </button>
              </div>

              <div className="p-6">
                {showForm && (
                  <form onSubmit={handleSaveActivity} className="bg-surface-2 rounded-2xl p-5 mb-8 border border-border">
                    <h3 className="font-bold text-primary mb-4">New Activity</h3>
                    <div className="grid sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Time</label>
                        <input type="time" value={formState.time} onChange={(e) => setFormState({...formState, time: e.target.value})} required className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Category</label>
                        <select value={formState.type} onChange={(e) => setFormState({...formState, type: e.target.value})} className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent">
                          <option value="Activity">Activity</option>
                          <option value="Dining">Dining</option>
                          <option value="Sightseeing">Sightseeing</option>
                          <option value="Travel">Travel</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Title</label>
                      <input type="text" placeholder="e.g. Dinner at Seaside Restaurant" value={formState.title} onChange={(e) => setFormState({...formState, title: e.target.value})} required className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Location (Optional)</label>
                        <input type="text" placeholder="Address or Place" value={formState.location} onChange={(e) => setFormState({...formState, location: e.target.value})} className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Estimated Cost ($)</label>
                        <input type="number" min="0" value={formState.cost} onChange={(e) => setFormState({...formState, cost: Number(e.target.value)})} className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent" />
                      </div>
                    </div>
                    <div className="mb-6">
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes (Optional)</label>
                      <textarea placeholder="Reservation number, items to bring..." value={formState.description} onChange={(e) => setFormState({...formState, description: e.target.value})} rows={2} className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent resize-none"></textarea>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-surface-1 rounded-lg">Cancel</button>
                      <button type="submit" disabled={saving} className="bg-primary hover:bg-primary-dark text-white px-5 py-2 rounded-lg font-semibold text-sm flex items-center gap-2">
                        {saving && <Loader2 className="w-3 h-3 animate-spin" />} Save Activity
                      </button>
                    </div>
                  </form>
                )}

                {activeDay.activities.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-surface-2 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CalendarIcon className="w-6 h-6 text-muted" />
                    </div>
                    <h3 className="text-lg font-bold text-primary">No activities planned</h3>
                    <p className="text-muted-foreground mt-1 max-w-sm mx-auto">Click "Add Activity" to start building your itinerary for this day.</p>
                  </div>
                ) : (
                  <div className="relative border-l-2 border-surface-2 ml-4 space-y-8 py-4">
                    {activeDay.activities.map((act) => (
                      <div key={act._id} className={`relative pl-8 transition-opacity ${act.isCompleted ? 'opacity-60' : ''}`}>
                        {/* Timeline dot */}
                        <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 ${act.isCompleted ? 'bg-green-500 border-green-500' : 'bg-white border-accent'}`}></div>
                        
                        <div className="bg-white border border-border rounded-2xl p-5 hover:shadow-md transition-shadow group">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-accent bg-accent/10 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" /> {act.time}
                              </span>
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                {getIcon(act.type)} {act.type}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => toggleComplete(act)} 
                                className={`p-1.5 rounded-md ${act.isCompleted ? 'text-green-600 hover:bg-green-50' : 'text-muted-foreground hover:bg-surface-2'}`}
                                title={act.isCompleted ? 'Mark incomplete' : 'Mark complete'}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => act._id && handleDelete(act._id)}
                                className="p-1.5 rounded-md text-red-500 hover:bg-red-50"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          <h4 className={`text-lg font-bold ${act.isCompleted ? 'text-muted-foreground line-through' : 'text-primary'}`}>
                            {act.title}
                          </h4>
                          
                          {act.location && (
                            <p className="text-sm text-text-secondary mt-1.5 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-muted" /> {act.location}
                            </p>
                          )}
                          
                          {act.description && (
                            <p className="text-sm text-muted-foreground mt-2 bg-surface-1 p-3 rounded-xl">
                              {act.description}
                            </p>
                          )}
                          
                          {act.cost > 0 && (
                            <div className="mt-3 inline-block bg-surface-2 px-2.5 py-1 rounded-md text-xs font-semibold text-text-secondary">
                              Est. Cost: ${act.cost}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </Layout>
  );
}
