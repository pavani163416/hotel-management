import Layout from "@/components/Layout";
import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { Link } from "react-router-dom";
import { AuthModal } from "@/components/AuthModal";
import { useBooking } from "@/context/BookingContext";
import {
  Search, ChevronDown, ChevronUp, Mail, Phone,
  MessageCircle, BookOpen, CreditCard, User,
  Bell, Star, HelpCircle, Send, Loader2, CheckCircle2
} from "lucide-react";
import api from "@/services/api";

// ── FAQ data ─────────────────────────────────────────────
const FAQ_CATEGORIES = [
  {
    icon: BookOpen,
    title: "Bookings",
    color: "bg-blue-50 text-blue-600 border-blue-100",
    items: [
      {
        q: "How do I make a reservation?",
        a: "Search for your destination on the Hotels page, select your dates and number of guests, choose a hotel and room, then complete the booking steps. You'll receive a confirmation email instantly.",
      },
      {
        q: "Can I modify my booking dates?",
        a: "Date modifications depend on the hotel's policy. Contact us via the form below with your Booking ID and the new dates you require. We'll liaise with the property on your behalf.",
      },
      {
        q: "How do I cancel a booking?",
        a: "Go to History → find your booking → click 'Cancel Booking'. Cancellation policies vary by property — check the policy shown at the time of booking. Refunds are processed within 5–10 business days.",
      },
      {
        q: "What happens if the hotel cancels my booking?",
        a: "If a hotel cancels your confirmed booking, you'll receive a full refund and we'll help you find alternative accommodation at the same or better rate.",
      },
    ],
  },
  {
    icon: CreditCard,
    title: "Payments & Refunds",
    color: "bg-green-50 text-green-600 border-green-100",
    items: [
      {
        q: "What payment methods are accepted?",
        a: "We accept all major credit/debit cards, UPI, net banking, and wallets via our secure Razorpay payment gateway.",
      },
      {
        q: "When will I receive my refund?",
        a: "Refunds are processed within 5–10 business days to your original payment method after the cancellation is confirmed.",
      },
      {
        q: "Is my payment information secure?",
        a: "Yes. All payments are processed by Razorpay with PCI DSS Level 1 compliance. We never store your card details.",
      },
    ],
  },
  {
    icon: User,
    title: "Account & Profile",
    color: "bg-purple-50 text-purple-600 border-purple-100",
    items: [
      {
        q: "How do I reset my password?",
        a: "Click 'Sign In' → 'Forgot Password?' → enter your email. A reset link will be sent to your inbox within a few minutes.",
      },
      {
        q: "How do I update my profile?",
        a: "Sign in → click your name in the top right → Profile. You can update your name, phone, and city from there.",
      },
      {
        q: "How do I delete my account?",
        a: "Contact our support team via the form below with the subject 'Account Deletion Request'. We'll process it within 7 business days.",
      },
    ],
  },
  {
    icon: Bell,
    title: "Notifications",
    color: "bg-orange-50 text-orange-600 border-orange-100",
    items: [
      {
        q: "Why am I not receiving booking confirmation emails?",
        a: "Check your spam/junk folder first. Ensure the email address on your account is correct. If the issue persists, contact us below.",
      },
      {
        q: "How do I manage notification preferences?",
        a: "Log in → Profile → you can control email and push notification settings from your account preferences.",
      },
    ],
  },
  {
    icon: Star,
    title: "Reviews",
    color: "bg-yellow-50 text-yellow-600 border-yellow-100",
    items: [
      {
        q: "How do I write a review?",
        a: "Visit the hotel's detail page → click the 'Reviews' tab → scroll to 'Write a Review'. Reviews are linked to your account.",
      },
      {
        q: "Can I edit my review after posting?",
        a: "Currently reviews cannot be edited after submission. Contact support if you need a review removed.",
      },
    ],
  },
];

// ── Ticket form ───────────────────────────────────────────
const CATEGORIES = [
  "Booking Issue",
  "Payment / Refund",
  "Account Access",
  "Hotel Complaint",
  "Check-in / Check-out",
  "Technical Issue",
  "Other",
];

const FAQItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-secondary/40 transition-colors"
        aria-expanded={open}
      >
        <span className="font-medium text-primary text-sm">{q}</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border bg-secondary/20">
          <p className="pt-3">{a}</p>
        </div>
      )}
    </div>
  );
};

const SupportCentre = () => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const { user } = useBooking();
  
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  const [form, setForm] = useState({ name: "", email: "", category: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");


  const handle = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    setError(""); setLoading(true);
    try {
      await api.post("/public/support/create", {
        fullName: form.name.trim(),
        email: form.email.trim(),
        issueType: form.category || "Other",
        subject: form.subject.trim() || "Support Request",
        message: form.message.trim(),
        message: form.message.trim(),
      });
      setSuccess(true);
      setForm({ name: "", email: "", category: "", subject: "", message: "" });
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Filter FAQ
  const filtered = FAQ_CATEGORIES
    .filter((cat) => activeCategory === "All" || cat.title === activeCategory)
    .map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) =>
          !search ||
          item.q.toLowerCase().includes(search.toLowerCase()) ||
          item.a.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((cat) => cat.items.length > 0);

  return (
    <Layout>
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-20 px-4">
        <div className="container max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary-foreground/15 rounded-full px-4 py-1.5 text-sm font-semibold mb-5">
            <HelpCircle className="w-4 h-4" /> Support Centre
          </div>
          <h1 className="font-display text-5xl font-bold mb-5">How can we help?</h1>
          <p className="text-primary-foreground/80 text-xl mb-8">
            Find answers instantly or reach our team directly.
          </p>

        </div>
      </div>

      {/* Quick contact strip */}
      <div className="bg-secondary/40 border-b border-border">
        <div className="container max-w-3xl mx-auto py-5 grid sm:grid-cols-2 gap-4">
          <a
            href="mailto:support@athithigriha.com"
            className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border hover:shadow-elegant transition-base group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 grid place-items-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Mail className="w-5 h-5 text-primary group-hover:text-primary-foreground transition-colors" />
            </div>
            <div>
              <p className="font-semibold text-primary text-sm">Email Support</p>
              <p className="text-muted-foreground text-xs">support@athithigriha.com</p>
            </div>
          </a>

          <div
            className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 grid place-items-center shrink-0">
              <Phone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-primary text-sm">Phone Support</p>
              <p className="text-muted-foreground text-xs">+1 (800) 123-4567</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-5xl mx-auto py-16 px-4 space-y-16">
        {/* Category tabs */}
        <div>
          <h2 className="font-display text-2xl font-bold mb-6">Frequently Asked Questions</h2>
          <div className="flex flex-wrap gap-2 mb-8">
            {["All", ...FAQ_CATEGORIES.map((c) => c.title)].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-base ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-primary hover:bg-secondary/70"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 bg-secondary/40 rounded-2xl">
              <HelpCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-primary font-semibold mb-2">No articles match your search</p>
              <p className="text-muted-foreground text-sm">Try a different keyword or submit a ticket below.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {filtered.map((cat) => {
                const Icon = cat.icon;
                return (
                  <div key={cat.title}>
                    <div className={`inline-flex items-center gap-2 ${cat.color} border rounded-xl px-3 py-1.5 text-sm font-semibold mb-4`}>
                      <Icon className="w-4 h-4" />
                      {cat.title}
                    </div>
                    <div className="space-y-2">
                      {cat.items.map((item) => (
                        <FAQItem key={item.q} q={item.q} a={item.a} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Submit a ticket */}
        <div className="bg-card border border-border rounded-3xl p-8 md:p-10">
          <div className="flex items-start gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 grid place-items-center shrink-0">
              <Send className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold">Still need help?</h2>
              <p className="text-muted-foreground mt-1">Submit a support ticket and we'll respond within 4 hours.</p>
            </div>
          </div>

          {success ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="font-display text-xl font-bold text-green-800 mb-2">Ticket Submitted!</h3>
              <p className="text-green-700 text-sm mb-4">Our team will get back to you within 4 hours.</p>
              <button
                onClick={() => setSuccess(false)}
                className="text-sm text-green-700 hover:underline font-semibold"
              >
                Submit another ticket
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5" noValidate>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Full Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text" value={form.name} onChange={(e) => handle("name", e.target.value)}
                    placeholder="Your name"
                    className="w-full px-4 py-2.5 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Email Address <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="email" value={form.email} onChange={(e) => handle("email", e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-4 py-2.5 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Category</label>
                  <select
                    value={form.category} onChange={(e) => handle("category", e.target.value)}
                    className="w-full px-4 py-2.5 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm bg-background"
                  >
                    <option value="">Select a category…</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Subject</label>
                  <input
                    type="text" value={form.subject} onChange={(e) => handle("subject", e.target.value)}
                    placeholder="Brief description"
                    className="w-full px-4 py-2.5 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Message <span className="text-destructive">*</span>
                </label>
                <textarea
                  rows={5} value={form.message} onChange={(e) => handle("message", e.target.value)}
                  placeholder="Describe your issue in detail…"
                  className="w-full px-4 py-2.5 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
                />
              </div>
              {error && <p role="alert" className="text-destructive text-sm font-medium">{error}</p>}
              <button
                type="submit" disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
              >
                {loading
                  ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting…</>
                  : <><Send className="w-4 h-4" /> Submit Support Ticket</>}
              </button>
            </form>
          )}
        </div>
      </div>
      {/* Auth popup */}
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        defaultMode={authMode}
      />
    </Layout>
  );
};

export default SupportCentre;
