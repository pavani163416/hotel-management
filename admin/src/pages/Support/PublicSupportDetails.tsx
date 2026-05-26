import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, FileText, Download, Mail, Phone, Calendar } from "lucide-react";
import api from "@/services/api";
import { toast } from "sonner";
import { format } from "date-fns";

export default function PublicSupportDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/public-support/${id}`);
      setTicket(res.data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to fetch ticket");
      navigate("/public-support");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const updateStatus = async (newStatus: string) => {
    try {
      setUpdating(true);
      await api.patch(`/admin/public-support/status/${id}`, { status: newStatus });
      setTicket((prev: any) => ({ ...prev, status: newStatus }));
      toast.success("Status updated successfully");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-[calc(100vh-100px)]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) return null;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      <button 
        onClick={() => navigate("/public-support")}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Requests
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-display font-bold text-foreground">{ticket.ticketId}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              ticket.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
              ticket.status === 'In Progress' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
              ticket.status === 'Resolved' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
              'bg-gray-500/10 text-gray-400 border-gray-500/20'
            }`}>
              {ticket.status}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              ticket.priority === 'High' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
              ticket.priority === 'Medium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
              'bg-green-500/10 text-green-500 border-green-500/20'
            }`}>
              {ticket.priority} Priority
            </span>
          </div>
          <p className="text-muted-foreground">{ticket.issueType}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-muted-foreground">Update Status:</label>
          <select
            disabled={updating}
            value={ticket.status}
            onChange={(e) => updateStatus(e.target.value)}
            className="px-4 py-2 bg-card border border-border rounded-lg outline-none focus:border-primary text-sm font-medium"
          >
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 border-b border-border pb-4">Message Details</h2>
            <div className="whitespace-pre-wrap text-foreground/90 text-sm leading-relaxed">
              {ticket.message}
            </div>
          </div>

          {ticket.attachments && ticket.attachments.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 border-b border-border pb-4">Attachments</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ticket.attachments.map((file: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                      <div className="truncate">
                        <p className="text-sm font-medium truncate" title={file.name}>{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB • {file.type.split('/')[1]?.toUpperCase() || 'FILE'}</p>
                      </div>
                    </div>
                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-muted rounded-md transition-colors text-primary">
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 border-b border-border pb-4">User Information</h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Full Name</p>
                <p className="font-medium">{ticket.fullName}</p>
              </div>
              
              {ticket.hotelName && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Hotel Name</p>
                  <p className="font-medium">{ticket.hotelName}</p>
                </div>
              )}
              
              <div className="flex items-center gap-3 pt-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <a href={`mailto:${ticket.email}`} className="text-sm font-medium hover:text-primary transition-colors">{ticket.email}</a>
                </div>
              </div>

              {ticket.phoneNumber && (
                <div className="flex items-center gap-3 pt-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <a href={`tel:${ticket.phoneNumber}`} className="text-sm font-medium hover:text-primary transition-colors">{ticket.phoneNumber}</a>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 border-b border-border pb-4">Ticket Info</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Created At
                </span>
                <span className="text-sm font-medium">{format(new Date(ticket.createdAt), "MMM d, yyyy HH:mm")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Last Updated
                </span>
                <span className="text-sm font-medium">{format(new Date(ticket.updatedAt), "MMM d, yyyy HH:mm")}</span>
              </div>
              {ticket.ipAddress && (
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground">IP Address</span>
                  <span className="text-xs font-mono">{ticket.ipAddress}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
