import { useState, useEffect } from "react";
import {
  Building2, Upload, CheckCircle2, AlertCircle, Loader2, LogIn,
  FileText, TrendingUp, Globe, ShieldCheck, Headphones, ArrowRight,
  Star, Users, DollarSign, X
} from "lucide-react";
import Layout from "@/components/Layout";
import api, { API } from "@/services/api";

type OwnerView = "landing" | "login" | "register" | "verify" | "dashboard";

const BENEFITS = [
  { icon: Globe, title: "Global Reach", text: "Connect with travelers from 45+ countries browsing LuxeStay daily." },
  { icon: TrendingUp, title: "Real-Time Revenue", text: "Track bookings and earnings live from your owner dashboard." },
  { icon: ShieldCheck, title: "Secure KYC Onboarding", text: "Verified partner process ensures trust and safety for all." },
  { icon: Headphones, title: "Dedicated Partner Support", text: "Our team is available 24/7 to help you succeed." },
  { icon: Users, title: "Easy Booking Management", text: "Manage all reservations from one clean interface." },
  { icon: DollarSign, title: "Competitive Commissions", text: "Industry-leading revenue split with no hidden fees." },
];

const STATS = [
  { value: "500+", label: "Partner Properties" },
  { value: "1M+", label: "Happy Guests" },
  { value: "45+", label: "Countries" },
  { value: "24/7", label: "Support" },
];

// ── File validation helpers ──────────────────────────────
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE_MB = 5;

function validateFiles(files: FileList): string | null {
  for (const file of Array.from(files)) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `${file.name}: Only JPG, PNG, WEBP and PDF files are allowed.`;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `${file.name}: File size must be under ${MAX_SIZE_MB}MB.`;
    }
  }
  return null;
}

const OwnerPortal = () => {
  const [view, setView] = useState<OwnerView>("landing");
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("luxe_owner_token"));
  const [ownerData, setOwnerData] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dashLoading, setDashLoading] = useState(false);

  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handle = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  // Auto-login if token exists
  useEffect(() => {
    if (token) loadDashboard(token);
  }, []);

  const loadDashboard = async (t: string) => {
    setDashLoading(true);
    try {
      const res: any = await api.get("/owners/dashboard", {
        headers: { Authorization: `Bearer ${t}` },
      } as any);
      const d = res.data?.data;
      setOwnerData(d?.owner);
      setDashboardData(d);
      setView("dashboard");
    } catch {
      localStorage.removeItem("luxe_owner_token");
      setToken(null);
      setView("landing");
    } finally { setDashLoading(false); }
  };

  const doRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError("Valid email is required."); return; }
    if (!form.phone.trim()) { setError("Phone number is required."); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setError(""); setLoading(true);
    try {
      await api.post("/owners/register", form);
      setSuccess("Registration successful! Check your email for a verification code.");
      setView("verify");
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally { setLoading(false); }
  };

  const doVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) { setError("Please enter the 6-digit code."); return; }
    setError(""); setLoading(true);
    try {
      await api.post("/owners/verify-email", { email: form.email, otp });
      setSuccess("Email verified! You can now sign in.");
      setView("login");
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid or expired code.");
    } finally { setLoading(false); }
  };

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError("Email and password are required."); return; }
    setError(""); setLoading(true);
    try {
      const res: any = await api.post("/owners/login", { email: form.email, password: form.password });
      const d = res.data?.data;
      localStorage.setItem("luxe_owner_token", d.token);
      setToken(d.token);
      await loadDashboard(d.token);
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed. Please check your credentials.");
    } finally { setLoading(false); }
  };

  const doLogout = () => {
    localStorage.removeItem("luxe_owner_token");
    setToken(null); setOwnerData(null); setDashboardData(null);
    setView("landing"); setError(""); setSuccess("");
    setForm({ name: "", email: "", password: "", phone: "" });
  };

  // ── Dashboard view ───────────────────────────────────────
  if (view === "dashboard") {
    if (dashLoading) {
      return (
        <Layout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        </Layout>
      );
    }

    const status = ownerData?.status || "pending";
    const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
      approved:  { color: "text-green-700", bg: "bg-green-50 border-green-200", label: "Approved" },
      pending:   { color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200", label: "Pending Review" },
      rejected:  { color: "text-red-700", bg: "bg-red-50 border-red-200", label: "Rejected" },
      suspended: { color: "text-orange-700", bg: "bg-orange-50 border-orange-200", label: "Suspended" },
    };
    const sc = statusConfig[status] || statusConfig.pending;

    return (
      <Layout>
        <div className="bg-gradient-to-br from-secondary via-background to-secondary/50 min-h-screen">
          <div className="container py-10 max-w-4xl">
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
              <div>
                <h1 className="font-display text-3xl font-bold">Owner Dashboard</h1>
                <p className="text-muted-foreground mt-1">Welcome back, {ownerData?.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${sc.bg} ${sc.color}`}>
                  {sc.label}
                </span>
                <button onClick={doLogout} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                  Sign out
                </button>
              </div>
            </div>

            {/* Status banners */}
            {status === "pending" && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 mb-6 flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-800">Application under review</p>
                  <p className="text-yellow-700 text-sm mt-1">Our team is reviewing your application. You'll be notified by email once approved. This typically takes 1–2 business days.</p>
                </div>
              </div>
            )}
            {status === "rejected" && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-6 flex gap-3">
                <X className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-800">Application not approved</p>
                  <p className="text-red-700 text-sm mt-1">{ownerData?.adminNotes || "Your application was rejected. Please contact support for more details."}</p>
                </div>
              </div>
            )}
            {status === "suspended" && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 mb-6 flex gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-orange-800">Account suspended</p>
                  <p className="text-orange-700 text-sm mt-1">{ownerData?.adminNotes || "Your account has been suspended. Please contact support."}</p>
                </div>
              </div>
            )}

            {/* Stats */}
            {dashboardData?.stats && (
              <div className="grid sm:grid-cols-3 gap-4 mb-6">
                {[
                  { label: "My Hotels", value: dashboardData.stats.totalHotels ?? 0, icon: Building2 },
                  { label: "Total Bookings", value: dashboardData.stats.totalBookings ?? 0, icon: Users },
                  { label: "Total Revenue", value: `$${(dashboardData.stats.totalRevenue ?? 0).toLocaleString()}`, icon: DollarSign },
                ].map((s) => (
                  <div key={s.label} className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 grid place-items-center shrink-0">
                      <s.icon className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-display text-2xl font-bold text-primary">{s.value}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* KYC Upload */}
            {ownerData?.kycStatus === "not_submitted" && (
              <div className="bg-card border border-border rounded-2xl p-6 mb-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 grid place-items-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold">Complete KYC Verification</h2>
                    <p className="text-muted-foreground text-sm mt-1">Upload your identity and business documents to get your account approved.</p>
                  </div>
                </div>
                <KYCUpload token={token!} onDone={() => setOwnerData({ ...ownerData, kycStatus: "pending" })} />
              </div>
            )}
            {ownerData?.kycStatus === "pending" && status === "pending" && (
              <div className="bg-card border border-border rounded-2xl p-5 mb-6 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                <p className="text-sm font-medium">KYC documents submitted. Awaiting admin review.</p>
              </div>
            )}

            {/* Hotels */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-display text-xl font-bold mb-4">My Hotels</h2>
              {!dashboardData?.hotels?.length ? (
                <div className="text-center py-8">
                  <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground text-sm">No hotels yet.</p>
                  <p className="text-muted-foreground text-xs mt-1">Once approved, contact our partner team to list your property.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboardData.hotels.map((h: any) => (
                    <div key={h.id || h.hotelId} className="flex items-center justify-between p-4 border border-border rounded-xl hover:bg-secondary/30 transition-colors">
                      <div>
                        <p className="font-semibold text-primary">{h.name}</p>
                        <p className="text-muted-foreground text-sm">{h.location}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${h.isActive ? "bg-green-50 text-green-600 border border-green-200" : "bg-secondary text-muted-foreground"}`}>
                        {h.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ── Auth form card ───────────────────────────────────────
  const AuthCard = (
    <div className="bg-card border border-border rounded-2xl p-8 w-full max-w-md shadow-luxe">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 grid place-items-center">
          <Building2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold">
            {view === "login" ? "Owner Sign In" : view === "register" ? "Create Owner Account" : "Verify Your Email"}
          </h2>
          <p className="text-muted-foreground text-xs">
            {view === "login" ? "Access your partner dashboard" : view === "register" ? "Start listing your property" : "Enter the code we sent you"}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl mb-4">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-xl mb-4">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
          <p className="text-green-700 text-sm">{success}</p>
        </div>
      )}

      {view === "login" && (
        <form onSubmit={doLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Email Address</label>
            <input type="email" value={form.email} onChange={(e) => handle("email", e.target.value)}
              className="w-full px-4 py-2.5 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Password</label>
            <input type="password" value={form.password} onChange={(e) => handle("password", e.target.value)}
              className="w-full px-4 py-2.5 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm" required />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-60">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : <><LogIn className="w-4 h-4" /> Sign In</>}
          </button>
          <div className="flex items-center justify-between text-sm">
            <button type="button" onClick={() => { setView("landing"); setError(""); setSuccess(""); }}
              className="text-muted-foreground hover:text-primary transition-colors">← Back</button>
            <button type="button" onClick={() => { setView("register"); setError(""); setSuccess(""); }}
              className="text-primary font-semibold hover:underline">New owner? Register</button>
          </div>
        </form>
      )}

      {view === "register" && (
        <form onSubmit={doRegister} className="space-y-4">
          {[
            { label: "Full Name *", key: "name", type: "text", placeholder: "John Smith" },
            { label: "Email Address *", key: "email", type: "email", placeholder: "john@hotel.com" },
            { label: "Phone Number *", key: "phone", type: "tel", placeholder: "+91 98765 43210" },
            { label: "Password *", key: "password", type: "password", placeholder: "Min 8 characters" },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium mb-1.5">{label}</label>
              <input type={type} value={form[key as keyof typeof form]} onChange={(e) => handle(key, e.target.value)}
                placeholder={placeholder}
                className="w-full px-4 py-2.5 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm" required />
            </div>
          ))}
          <button type="submit" disabled={loading}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-60">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</> : "Create Owner Account"}
          </button>
          <div className="flex items-center justify-between text-sm">
            <button type="button" onClick={() => { setView("landing"); setError(""); setSuccess(""); }}
              className="text-muted-foreground hover:text-primary transition-colors">← Back</button>
            <button type="button" onClick={() => { setView("login"); setError(""); setSuccess(""); }}
              className="text-primary font-semibold hover:underline">Already registered? Sign in</button>
          </div>
        </form>
      )}

      {view === "verify" && (
        <form onSubmit={doVerifyEmail} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit verification code sent to <strong className="text-primary">{form.email}</strong>
          </p>
          <input type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000" maxLength={6} autoComplete="one-time-code"
            className="w-full px-4 py-3 border border-border rounded-xl outline-none text-center text-3xl tracking-[0.6em] font-bold focus:ring-2 focus:ring-primary" required />
          <button type="submit" disabled={loading || otp.length !== 6}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-60">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : <><CheckCircle2 className="w-4 h-4" /> Verify Email</>}
          </button>
          <button type="button" onClick={() => { setView("login"); setError(""); setSuccess(""); }}
            className="w-full text-sm text-muted-foreground hover:text-primary transition-colors">
            Back to sign in
          </button>
        </form>
      )}
    </div>
  );

  // ── Landing page ─────────────────────────────────────────
  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-20 px-4">
        <div className="container max-w-4xl mx-auto text-center">
          <span className="inline-block bg-primary-foreground/15 text-primary-foreground text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full mb-5">
            Partner Programme
          </span>
          <h1 className="font-display text-4xl sm:text-5xl font-bold mb-5 leading-tight">
            Own a Hotel or Resort?
          </h1>
          <p className="text-primary-foreground/80 text-xl max-w-2xl mx-auto mb-8">
            Partner with LuxeStay and reach thousands of travelers worldwide. List your property and grow your revenue with our luxury booking platform.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={() => { setView("register"); setError(""); setSuccess(""); }}
              className="flex items-center gap-2 bg-primary-foreground text-primary font-semibold px-8 py-3.5 rounded-xl hover:bg-primary-foreground/90 transition-base text-sm">
              List Your Property <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => { setView("login"); setError(""); setSuccess(""); }}
              className="flex items-center gap-2 border border-primary-foreground/30 text-primary-foreground font-semibold px-8 py-3.5 rounded-xl hover:bg-primary-foreground/10 transition-base text-sm">
              Partner Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-secondary/40 py-8">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="font-display text-3xl font-bold text-primary">{s.value}</p>
                <p className="text-muted-foreground text-sm mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="container py-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">Why Partner with LuxeStay?</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">Everything you need to grow your hospitality business.</p>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 mb-16">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="bg-card border border-border rounded-2xl p-6 hover:shadow-elegant hover:border-accent/30 transition-base">
              <div className="w-11 h-11 rounded-xl bg-accent/10 grid place-items-center mb-4">
                <Icon className="w-5 h-5 text-accent" />
              </div>
              <h3 className="font-semibold text-primary mb-2">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="bg-secondary/40 rounded-3xl p-8 md:p-12 mb-16">
          <h2 className="font-display text-2xl font-bold text-center mb-8">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Register", text: "Create your owner account with name, email and phone." },
              { step: "2", title: "Verify", text: "Confirm your email address with the 6-digit code." },
              { step: "3", title: "Submit KYC", text: "Upload your identity and business documents for verification." },
              { step: "4", title: "Go Live", text: "Once approved, your properties appear on LuxeStay." },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-display text-xl font-bold grid place-items-center mx-auto mb-3">
                  {s.step}
                </div>
                <h3 className="font-semibold text-primary mb-1">{s.title}</h3>
                <p className="text-muted-foreground text-sm">{s.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA with auth form side by side */}
        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div>
            <h2 className="font-display text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Join hundreds of hotel partners already growing with LuxeStay. The registration process takes less than 5 minutes.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                "No upfront costs to list",
                "Approval within 1–2 business days",
                "Full dashboard access after approval",
                "Dedicated onboarding support",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  <span className="text-primary">{item}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-accent/20 border-2 border-background grid place-items-center text-[10px] font-bold text-accent">
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
              </div>
              <span>500+ partners already on board</span>
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-accent text-accent" />
                <span>4.9 partner satisfaction</span>
              </div>
            </div>
          </div>
          {AuthCard}
        </div>
      </section>
    </Layout>
  );
};

// ── KYC Upload with validation ───────────────────────────
const KYCUpload = ({ token, onDone }: { token: string; onDone: () => void }) => {
  const [files, setFiles] = useState<FileList | null>(null);
  const [docType, setDocType] = useState("aadhar");
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [fileError, setFileError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files;
    if (!f?.length) return;
    const err = validateFiles(f);
    if (err) { setFileError(err); return; }
    setFileError("");
    setFiles(f);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files?.length) { setFileError("Please select at least one document."); return; }
    const err = validateFiles(files);
    if (err) { setFileError(err); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("docType", docType);
      Array.from(files).forEach((f) => fd.append("documents", f));
      const res = await fetch(`${API}/owners/kyc-documents`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      setDone(true);
      onDone();
    } catch { setFileError("Upload failed. Please try again."); }
    finally { setUploading(false); }
  };

  if (done) {
    return (
      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-800">Documents submitted successfully!</p>
          <p className="text-xs text-green-700 mt-0.5">Our team will review your KYC within 1–2 business days.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1.5">Document Type</label>
        <select value={docType} onChange={(e) => setDocType(e.target.value)}
          className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary bg-background">
          <option value="aadhar">Aadhar Card</option>
          <option value="pan">PAN Card</option>
          <option value="passport">Passport</option>
          <option value="business_reg">Business Registration Certificate</option>
          <option value="gst">GST Certificate</option>
        </select>
      </div>
      <div className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${fileError ? "border-destructive bg-destructive/5" : "border-border hover:border-accent"}`}>
        <FileText className="w-7 h-7 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-1">JPG, PNG, WEBP or PDF — max {MAX_SIZE_MB}MB per file</p>
        <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple onChange={handleFileChange}
          className="text-sm text-primary cursor-pointer" />
        {files && files.length > 0 && (
          <p className="text-xs text-green-700 mt-2 font-medium">{files.length} file(s) selected</p>
        )}
      </div>
      {fileError && (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-destructive text-xs">{fileError}</p>
        </div>
      )}
      <button type="submit" disabled={uploading || !files?.length}
        className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
        {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Submit KYC Documents</>}
      </button>
    </form>
  );
};

export default OwnerPortal;
