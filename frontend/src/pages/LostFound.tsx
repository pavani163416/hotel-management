import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { Loader2, Plus, Search, Tag, Calendar, MapPin, Package, Eye, PackageSearch, AlertCircle } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { toast } from "sonner";

interface LostFoundEntry {
  _id: string;
  hotelId: { _id: string; name: string; location: string } | null;
  type: string;
  itemName: string;
  category: string;
  description: string;
  dateLostFound: string;
  locationDetails: string;
  status: string;
  createdAt: string;
}

export default function LostFound() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<LostFoundEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [hotels, setHotels] = useState<{_id: string, name: string}[]>([]);

  // Form State
  const [type, setType] = useState("Lost");
  const [hotelId, setHotelId] = useState("");
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("Electronics");
  const [description, setDescription] = useState("");
  const [dateLostFound, setDateLostFound] = useState("");
  const [locationDetails, setLocationDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    fetchReports();
    fetchHotels();
  }, [user, navigate]);

  const fetchReports = async () => {
    try {
      const res = await api.get("/lost-found/my");
      setReports(res.data.data);
    } catch (err) {
      console.error("Failed to fetch reports", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHotels = async () => {
    try {
      // In a real app we'd fetch the user's past booking hotels, but we'll fetch all for simplicity
      const res = await api.get("/hotels/list");
      if (res.data.success) setHotels(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/lost-found/report", {
        hotelId, type, itemName, category, description, dateLostFound, locationDetails
      });
      toast.success("Report submitted successfully");
      setShowModal(false);
      resetForm();
      fetchReports();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteReport = async (id: string) => {
    if (!confirm("Are you sure you want to delete this report?")) return;
    try {
      await api.delete(`/lost-found/${id}`);
      toast.success("Report deleted");
      fetchReports();
    } catch (err) {
      toast.error("Failed to delete report");
    }
  };

  const resetForm = () => {
    setType("Lost");
    setHotelId("");
    setItemName("");
    setCategory("Electronics");
    setDescription("");
    setDateLostFound("");
    setLocationDetails("");
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
        <div className="container max-w-5xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-display font-bold text-primary flex items-center gap-3">
                <PackageSearch className="w-8 h-8 text-accent" />
                Lost & Found
              </h1>
              <p className="text-text-secondary mt-1">Report and track items lost or found at our properties.</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="bg-primary text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-primary-dark transition-colors"
            >
              <Plus className="w-4 h-4" /> New Report
            </button>
          </div>

          {reports.length === 0 ? (
            <div className="bg-white rounded-3xl border border-border p-16 text-center shadow-sm">
              <Package className="w-16 h-16 text-muted mx-auto mb-4" />
              <h3 className="text-xl font-bold text-primary mb-2">No Reports Yet</h3>
              <p className="text-text-secondary mb-6 max-w-md mx-auto">
                Have you lost something during your stay or found an item? Create a report and we'll help you.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="bg-accent text-white px-6 py-2.5 rounded-lg font-medium hover:bg-accent/90 transition-colors"
              >
                Create Report
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reports.map((r) => (
                <div key={r._id} className="bg-white rounded-2xl border border-border overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                  <div className={`px-5 py-3 border-b flex justify-between items-center ${r.type === 'Lost' ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'}`}>
                    <span className={`font-bold text-sm tracking-wider uppercase ${r.type === 'Lost' ? 'text-amber-700' : 'text-blue-700'}`}>
                      {r.type} Item
                    </span>
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      r.status === 'Reported' ? 'bg-gray-200 text-gray-700' :
                      r.status === 'Matched' ? 'bg-green-200 text-green-800' :
                      r.status === 'Returned' ? 'bg-primary/20 text-primary' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {r.status}
                    </span>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-primary mb-1">{r.itemName}</h3>
                    <p className="text-xs text-text-secondary flex items-center gap-1 mb-4">
                      <Tag className="w-3.5 h-3.5" /> {r.category}
                    </p>
                    
                    <div className="space-y-2 mb-4 flex-1">
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-text-primary">{r.hotelId?.name || "Unknown Hotel"}</p>
                          <p className="text-xs text-text-secondary">{r.locationDetails}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted shrink-0 mt-0.5" />
                        <span className="text-text-secondary">{dayjs(r.dateLostFound).format("MMMM D, YYYY")}</span>
                      </div>
                    </div>
                    
                    <div className="text-sm bg-surface-1 p-3 rounded-xl border border-border/50 text-text-secondary line-clamp-2 italic mb-4">
                      "{r.description}"
                    </div>

                    <div className="mt-auto flex justify-between items-center pt-4 border-t border-border">
                      <span className="text-[10px] text-muted font-medium">Ref: {r._id.slice(-6).toUpperCase()}</span>
                      <button onClick={() => deleteReport(r._id)} className="text-xs text-danger hover:underline font-medium">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl border border-border">
            <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-bold font-display text-primary">Report an Item</h2>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-text-primary text-xl">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="flex gap-4 p-1 bg-surface-2 rounded-xl">
                <button type="button" onClick={() => setType("Lost")} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${type === 'Lost' ? 'bg-white shadow text-primary' : 'text-text-secondary hover:text-primary'}`}>
                  I Lost Something
                </button>
                <button type="button" onClick={() => setType("Found")} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${type === 'Found' ? 'bg-white shadow text-primary' : 'text-text-secondary hover:text-primary'}`}>
                  I Found Something
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-text-primary">Hotel Property *</label>
                <select value={hotelId} onChange={(e) => setHotelId(e.target.value)} required className="w-full border border-border bg-surface-1 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent">
                  <option value="">Select a hotel</option>
                  {hotels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
                </select>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-text-primary">Item Name *</label>
                  <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} required placeholder="e.g. Apple AirPods" className="w-full border border-border bg-surface-1 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-text-primary">Category *</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border border-border bg-surface-1 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent">
                    <option value="Electronics">Electronics</option>
                    <option value="Clothing">Clothing</option>
                    <option value="Jewelry">Jewelry</option>
                    <option value="Documents">Documents</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-text-primary">Date {type} *</label>
                  <input type="date" value={dateLostFound} max={new Date().toISOString().split("T")[0]} onChange={(e) => setDateLostFound(e.target.value)} required className="w-full border border-border bg-surface-1 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-text-primary">Where was it {type.toLowerCase()}? *</label>
                  <input type="text" value={locationDetails} onChange={(e) => setLocationDetails(e.target.value)} required placeholder="e.g. Lobby, Room 102" className="w-full border border-border bg-surface-1 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-text-primary">Detailed Description *</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} required placeholder={`Describe the item in detail (color, brand, unique marks)...`} rows={3} className="w-full border border-border bg-surface-1 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent resize-none"></textarea>
              </div>

              <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                <p className="text-xs text-accent-dark leading-relaxed">
                  Our staff will review your report. If a match is found, you will receive a notification here and via email. Unclaimed found items are handed over to local authorities after 90 days.
                </p>
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-border">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-bold text-text-secondary hover:bg-surface-2 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="bg-primary hover:bg-primary-dark disabled:opacity-70 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
