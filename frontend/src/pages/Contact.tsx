import Layout from "@/components/Layout";
import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { Phone, Mail, Clock, Send, Loader2, CheckCircle2 } from "lucide-react";
import api from "@/services/api";

const ADMIN_EMAIL = "hello@luxestay.com";

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [captchaId, setCaptchaId] = useState("");
  const [captchaChallenge, setCaptchaChallenge] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaLoading, setCaptchaLoading] = useState(false);

  const fetchCaptcha = async () => {
    setCaptchaLoading(true);
    setCaptchaAnswer("");
    try {
      const res: any = await api.get("/auth/captcha");
      const d = res.data?.data || res.data || {};
      setCaptchaId(d.captchaId || "");
      setCaptchaChallenge(d.challenge || "");
    } catch {
      setCaptchaChallenge(""); setCaptchaId("");
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => {
    fetchCaptcha();
  }, []);

  const handle = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!form.message.trim()) {
      setError("Please enter a message.");
      return;
    }
    if (captchaChallenge && !captchaAnswer.trim()) {
      setError("Please complete the security check.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await api.post("/public/support/create", {
        guestName: form.name.trim(),
        guestEmail: form.email.trim(),
        subject: form.subject.trim() || "Contact Form Inquiry",
        message: form.message.trim(),
        category: "Other",
        captchaId,
        captchaAnswer: captchaAnswer.trim(),
      });
      setSuccess(true);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Failed to send. Please try again."
      );
      fetchCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-20 px-4">
        <div className="container max-w-3xl mx-auto text-center">
          <h1 className="font-display text-5xl font-bold mb-5">Get in Touch</h1>
          <p className="text-primary-foreground/80 text-xl">
            Whether you have a question, feedback, or just want to say hello — we'd love to hear from you.
          </p>
        </div>
      </div>

      <div className="container max-w-5xl mx-auto py-16 px-4">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div>
            <h2 className="font-display text-3xl font-bold text-foreground mb-6">Contact Information</h2>
            <div className="space-y-6">
              {[
                {
                  icon: Phone,
                  title: "Phone",
                  text: "+1 (800) 123-4567\n+91 98765 43210",
                },
                {
                  icon: Mail,
                  title: "Email",
                  text: "hello@luxestay.com\nsupport@luxestay.com",
                },
                {
                  icon: Clock,
                  title: "Working Hours",
                  text: "Mon–Fri: 9:00 AM – 8:00 PM IST\nWeekends: 10:00 AM – 6:00 PM IST",
                },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground mb-0.5">{title}</div>
                    <p className="text-muted-foreground text-sm whitespace-pre-line">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div>
            <h2 className="font-display text-3xl font-bold text-foreground mb-6">Send a Message</h2>
            {success ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-10 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="font-display text-xl font-bold text-green-800 mb-2">Message Sent!</h3>
                <p className="text-green-700 text-sm">
                  Thank you for reaching out. We'll get back to you within 24 hours.
                </p>
                <button
                  onClick={() => { setSuccess(false); setForm({ name: "", email: "", subject: "", message: "" }); fetchCaptcha(); }}
                  className="mt-6 text-sm text-green-700 hover:underline font-semibold"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5" noValidate>
                {/* "To" field — shows admin email, read-only */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">To</label>
                  <div className="w-full px-4 py-2.5 border border-border rounded-xl bg-secondary/40 text-muted-foreground text-sm flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                    {ADMIN_EMAIL}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="contact-name" className="block text-sm font-medium text-foreground mb-1.5">
                      Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      value={form.name}
                      onChange={(e) => handle("name", e.target.value)}
                      placeholder="Your full name"
                      className="w-full px-4 py-2.5 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="block text-sm font-medium text-foreground mb-1.5">
                      Your Email <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => handle("email", e.target.value)}
                      placeholder="name@example.com"
                      className="w-full px-4 py-2.5 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-subject" className="block text-sm font-medium text-foreground mb-1.5">Subject</label>
                  <input
                    id="contact-subject"
                    type="text"
                    value={form.subject}
                    onChange={(e) => handle("subject", e.target.value)}
                    placeholder="What's this about?"
                    className="w-full px-4 py-2.5 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-sm font-medium text-foreground mb-1.5">
                    Message <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    rows={6}
                    value={form.message}
                    onChange={(e) => handle("message", e.target.value)}
                    placeholder="Tell us how we can help..."
                    className="w-full px-4 py-2.5 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
                  />
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

                {error && (
                  <p role="alert" className="text-destructive text-sm font-medium">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Send Message</>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Contact;
