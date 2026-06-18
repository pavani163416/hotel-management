import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { Loader2, Clock, CheckCircle2, XCircle, AlertCircle, Calendar } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

interface WaitlistEntry {
  _id: string;
  hotelId: { name: string; location: string; images: string[] };
  roomTypeId: { name: string; type: string } | null;
  startDate: string;
  endDate: string;
  position: number;
  status: string;
  notifiedAt: string | null;
  bookingWindowExpiresAt: string | null;
}

export default function MyWaitlists() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [waitlists, setWaitlists] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    fetchWaitlists();
  }, [user, navigate]);

  const fetchWaitlists = async () => {
    try {
      const res = await api.get("/waitlist/my");
      setWaitlists(res.data.data);
    } catch (err) {
      console.error("Failed to fetch waitlists", err);
    } finally {
      setLoading(false);
    }
  };

  const cancelWaitlist = async (id: string) => {
    if (!confirm("Are you sure you want to cancel your waitlist position?")) return;
    setCancelling(id);
    try {
      await api.delete(`/waitlist/cancel/${id}`);
      fetchWaitlists();
    } catch (err) {
      console.error(err);
      alert("Failed to cancel waitlist.");
    } finally {
      setCancelling(null);
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

  return (
    <Layout>
      <div className="bg-surface-1 min-h-[80vh] py-12">
        <div className="container max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-primary mb-2">My Waitlists</h1>
            <p className="text-text-secondary">Track your queue position for fully booked properties.</p>
          </div>

          {waitlists.length === 0 ? (
            <div className="bg-white rounded-2xl border border-border p-12 text-center shadow-sm">
              <Clock className="w-12 h-12 text-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-text-primary mb-2">No active waitlists</h3>
              <p className="text-text-secondary mb-6">You haven't joined any waitlists yet.</p>
              <button 
                onClick={() => navigate("/hotels")}
                className="bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-dark transition-colors"
              >
                Explore Hotels
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {waitlists.map((w) => {
                const isNotified = w.status === "Notified";
                const isPending = w.status === "Pending";
                const isExpired = w.status === "Expired";
                const isCancelled = w.status === "Cancelled";
                
                let timeRemaining = null;
                if (isNotified && w.bookingWindowExpiresAt) {
                  const diff = dayjs(w.bookingWindowExpiresAt).diff(dayjs(), 'hour');
                  timeRemaining = diff > 0 ? `${diff} hours left to book` : "Expired";
                }

                return (
                  <div key={w._id} className={`bg-white rounded-2xl border ${isNotified ? 'border-accent shadow-md' : 'border-border shadow-sm'} p-5 flex flex-col md:flex-row gap-6 relative overflow-hidden transition-all`}>
                    
                    {/* Status Ribbon */}
                    {isNotified && (
                      <div className="absolute top-0 right-0 bg-accent text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                        Action Required
                      </div>
                    )}

                    {/* Image */}
                    <div className="w-full md:w-40 h-32 rounded-xl bg-surface-2 overflow-hidden shrink-0">
                      {w.hotelId?.images?.[0] ? (
                        <img src={w.hotelId.images[0]} alt={w.hotelId.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted">No Image</div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-lg font-bold text-primary">{w.hotelId?.name || "Unknown Hotel"}</h3>
                          <p className="text-sm text-text-secondary">{w.hotelId?.location || "Unknown Location"}</p>
                        </div>
                        {isPending && (
                          <div className="bg-surface-2 border border-border px-3 py-1.5 rounded-lg text-center min-w-[80px]">
                            <p className="text-[10px] uppercase font-bold text-text-secondary">Position</p>
                            <p className="text-xl font-display font-bold text-primary">#{w.position}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary mb-4 bg-surface-1 p-3 rounded-lg border border-border/50">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span className="font-medium">{dayjs(w.startDate).format("MMM D")} - {dayjs(w.endDate).format("MMM D, YYYY")}</span>
                        </div>
                        {w.roomTypeId && (
                          <div className="flex items-center gap-2 border-l border-border pl-4">
                            <span className="w-2 h-2 rounded-full bg-accent"></span>
                            <span>{w.roomTypeId.name}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions & Status */}
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
                        <div className="flex items-center gap-2">
                          {isPending && <><Clock className="w-4 h-4 text-warning" /><span className="text-sm font-medium text-warning">Waiting in queue...</span></>}
                          {isNotified && <><AlertCircle className="w-4 h-4 text-accent" /><span className="text-sm font-bold text-accent">Room Available! {timeRemaining}</span></>}
                          {w.status === "Booked" && <><CheckCircle2 className="w-4 h-4 text-success" /><span className="text-sm font-medium text-success">Successfully Booked</span></>}
                          {(isExpired || isCancelled) && <><XCircle className="w-4 h-4 text-danger" /><span className="text-sm font-medium text-danger">{w.status}</span></>}
                        </div>

                        <div className="flex items-center gap-3">
                          {(isPending || isNotified) && (
                            <button
                              onClick={() => cancelWaitlist(w._id)}
                              disabled={cancelling === w._id}
                              className="text-sm font-medium text-text-secondary hover:text-danger transition-colors"
                            >
                              {cancelling === w._id ? "Cancelling..." : "Cancel Request"}
                            </button>
                          )}
                          
                          {isNotified && (
                            <button 
                              onClick={() => navigate(`/booking/${w.hotelId._id}`)}
                              className="bg-accent text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-accent/90 shadow-md transition-colors"
                            >
                              Book Now
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
