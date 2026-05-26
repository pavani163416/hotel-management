import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, UploadCloud, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/services/api";
import { toast } from "sonner";

type ContactAdminModalProps = {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
};

export function ContactAdminModal({ isOpen, onClose, defaultEmail = "" }: ContactAdminModalProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ticketId, setTicketId] = useState("");

  const [formData, setFormData] = useState({
    fullName: "",
    hotelName: "",
    email: defaultEmail,
    phoneNumber: "",
    issueType: "Login Problem",
    priority: "Medium",
    message: ""
  });
  
  const [files, setFiles] = useState<File[]>([]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      // Only reset after a small delay to allow animation to finish
      setTimeout(resetForm, 300);
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: "",
      hotelName: "",
      email: defaultEmail,
      phoneNumber: "",
      issueType: "Login Problem",
      priority: "Medium",
      message: ""
    });
    setFiles([]);
    setSuccess(false);
    setTicketId("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles = selectedFiles.filter(file => {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is larger than 5MB`);
          return false;
        }
        if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type)) {
          toast.error(`${file.name} has an invalid file type`);
          return false;
        }
        return true;
      });

      setFiles(prev => {
        const newFiles = [...prev, ...validFiles];
        if (newFiles.length > 5) {
          toast.error("Maximum 5 files allowed");
          return newFiles.slice(0, 5);
        }
        return newFiles;
      });
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.issueType || !formData.message) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value);
      });
      files.forEach(file => {
        data.append("attachments", file);
      });

      const res: any = await api.post("/public/support/create", data, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      
      setTicketId(res.data.ticketId);
      setSuccess(true);
      toast.success("Support request submitted successfully");
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-background/95 backdrop-blur-md border border-border/50 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-bold text-foreground">
            Contact System Admin
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div 
              key="success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="py-10 flex flex-col items-center text-center space-y-4"
            >
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center text-primary mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold">Request Submitted Successfully</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                Our system administrator will contact you shortly. Please save your ticket ID for reference.
              </p>
              <div className="bg-muted px-6 py-3 rounded-xl font-mono text-lg font-medium border border-border">
                {ticketId}
              </div>
              <button 
                onClick={() => handleOpenChange(false)}
                className="mt-6 px-8 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-base"
              >
                Close
              </button>
            </motion.div>
          ) : (
            <motion.form 
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit} 
              className="space-y-4 mt-2 max-h-[70vh] overflow-y-auto pr-2"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name <span className="text-destructive">*</span></label>
                  <input type="text" required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                    placeholder="John Doe" autoFocus />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address <span className="text-destructive">*</span></label>
                  <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                    placeholder="name@example.com" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Hotel Name</label>
                  <input type="text" value={formData.hotelName} onChange={e => setFormData({...formData, hotelName: e.target.value})}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                    placeholder="LuxeStay (Optional)" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number</label>
                  <input type="tel" value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                    placeholder="+1 555 000 0000" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Issue Type <span className="text-destructive">*</span></label>
                  <select required value={formData.issueType} onChange={e => setFormData({...formData, issueType: e.target.value})}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm">
                    <option value="Login Problem">Login Problem</option>
                    <option value="Forgot Password">Forgot Password</option>
                    <option value="Technical Issue">Technical Issue</option>
                    <option value="Billing Problem">Billing Problem</option>
                    <option value="Hotel Setup Issue">Hotel Setup Issue</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority <span className="text-destructive">*</span></label>
                  <select required value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Message <span className="text-destructive">*</span></label>
                <textarea required value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm min-h-[100px] resize-y"
                  placeholder="Describe your issue in detail..." />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center justify-between">
                  Attachments (Optional)
                  <span className="text-xs text-muted-foreground">{files.length}/5 files</span>
                </label>
                <div className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center hover:bg-muted/50 transition-colors relative">
                  <input type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    disabled={files.length >= 5} />
                  <UploadCloud className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-foreground font-medium">Click or drag files to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP, PDF (Max 5MB each)</p>
                </div>

                {files.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                    {files.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-muted p-2 rounded-md border border-border/50">
                        <span className="text-xs truncate max-w-[180px]" title={file.name}>{file.name}</span>
                        <button type="button" onClick={() => removeFile(idx)} className="text-muted-foreground hover:text-destructive">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border mt-6">
                <button type="submit" disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded-lg font-semibold flex items-center justify-center transition-base shadow-md shadow-primary/20">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Request"}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
