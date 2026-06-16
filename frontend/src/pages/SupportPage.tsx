import Layout from "@/components/Layout";
import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { MessageCircle, Clock, CheckCircle2, Loader2 } from "lucide-react";
import api from "@/services/api";

const categories = [
  "Booking Issue",
  "Payment / Refund",
  "Account Access",
  "Hotel Complaint",
  "Check-in / Check-out",
  "Technical Issue",
  "Other",
];

const Support = () => {
  const [form, setForm] = useState({ name: "", email: "", category: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // CAPTCHA removed from public support form (server-side optional verification handled if provided)

  const handle = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.message) {
      setError("Please fill all required fields.");
      return;
    }
    // no captcha required for support tickets
    setError(""); setLoading(true);
    try {
      await api.post("/public/support/create", {
        guestName: form.name,
        guestEmail: form.email,
        category: form.category || "Other",
        subject: form.subject,
        message: form.message,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to submit. Please try again.");
      fetchCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-20 px-4">
        <div className="container max-w-2xl mx-auto text-center">
          <h1 className="font-display text-5xl font-bold mb-4">Support Center</h1>
          <p className="text-primary-foreground/80 text-lg">
            Can't find what you're looking for? Our team is here 24/7.
          </p>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto py-16 px-4">
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            { icon: MessageCircle, title: "Live Chat", text: "Available 24/7 for instant support", action: "Start Chat" },
            { icon: Clock, title: "Response Time", text: "Email tickets answered within 4 hours", action: null },
            { icon: CheckCircle2, title: "Resolution Rate", text: "98% of tickets resolved within 24 hours", action: null },
          ].map(({ icon: Icon, title, text, action }) => (
            <div key={title} className="bg-card border border-border rounded-2xl p-6 text-center hover:shadow-md transition-shadow">
              <Icon className="w-8 h-8 text-primary mx-auto mb-3" />
              <div className="font-semibold text-foreground mb-1">{title}</div>
              <p className="text-muted-foreground text-sm mb-3">{text}</p>
              {action && (
                <button className="text-sm text-primary font-semibold hover:underline">{action}</button>
              )}
            </div>
          ))}
        </div>

        {success ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-10 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="font-display text-2xl font-bold text-green-800 mb-2">Ticket Submitted!</h2>
            <p className="text-green-700">We've received your message. Our team will respond within 4 hours.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-8">
            <h2 className="font-display text-2xl font-bold text-foreground mb-6">Open a Support Ticket</h2>
            <form onSubmit={submit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="support-name" className="block text-sm font-medium text-foreground mb-1.5">Full Name <span className="text-destructive">*</span></label>
                  <input id="support-name" type="text" value={form.name} onChange={(e) => handle("name", e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-2.5 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm" />
                </div>
                <div>
                  <label htmlFor="support-email" className="block text-sm font-medium text-foreground mb-1.5">Email <span className="text-destructive">*</span></label>
                  <input id="support-email" type="email" value={form.email} onChange={(e) => handle("email", e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-4 py-2.5 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="support-category" className="block text-sm font-medium text-foreground mb-1.5">Category</label>
                  <select id="support-category" value={form.category} onChange={(e) => handle("category", e.target.value)}
                    className="w-full px-4 py-2.5 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm bg-background">
                    <option value="">Select a category...</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="support-subject" className="block text-sm font-medium text-foreground mb-1.5">Subject <span className="text-destructive">*</span></label>
                  <input id="support-subject" type="text" value={form.subject} onChange={(e) => handle("subject", e.target.value)}
                    placeholder="Brief description of your issue"
                    className="w-full px-4 py-2.5 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm" />
                </div>
              </div>
              <div>
                <label htmlFor="support-message" className="block text-sm font-medium text-foreground mb-1.5">Message <span className="text-destructive">*</span></label>
                <textarea id="support-message" rows={5} value={form.message} onChange={(e) => handle("message", e.target.value)}
                  placeholder="Please describe your issue in detail..."
                  className="w-full px-4 py-2.5 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm resize-none" />
              </div>

              {captchaChallenge && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="captcha-input" className="block text-sm font-medium text-foreground">Security Check</label>
                    <button type="button" onClick={fetchCaptcha} disabled={captchaLoading}
                      className="text-xs text-primary hover:underline flex items-center gap-1">
                      {captchaLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "↻"} New challenge
                    </button>
                  </div>
                  <div className="bg-secondary/60 border border-border rounded-xl px-4 py-2 text-sm font-mono font-semibold text-foreground flex justify-center items-center">
                    {captchaChallenge.trim().startsWith('<svg') 
                      ? <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(captchaChallenge) }} />
                      : captchaChallenge}
                  </div>
                  <input id="captcha-input" type="text" value={captchaAnswer} onChange={e => setCaptchaAnswer(e.target.value)}
                    className="w-full px-4 py-2.5 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
                    placeholder="Your answer" autoComplete="off" />
                </div>
              )}

              {error && <p className="text-destructive text-sm font-medium">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</> : "Submit Ticket"}
              </button>
            </form>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Support;
