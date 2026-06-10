import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, Upload, CheckCircle2, AlertCircle, Loader2, LogIn,
  FileText, TrendingUp, Globe, ShieldCheck, Headphones, ArrowRight,
  Star, Users, DollarSign, X, Eye, EyeOff, ClipboardList,
  UserCheck, BadgeCheck, Clock3
} from "lucide-react";
import Layout from "@/components/Layout";
import api, { API } from "@/services/api";
import { AuthModal } from "@/components/AuthModal";
import { useBooking } from "@/context/BookingContext";

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

const PROCESS_STEPS = [
  {
    step: "01",
    icon: UserCheck,
    title: "Create an Account",
    desc: "Sign up or log in with your LuxeStay customer account. All applications require a verified account.",
    color: "bg-secondary/30",
    border: "border-border",
    iconColor: "text-muted-foreground",
  },
  {
    step: "02",
    icon: ClipboardList,
    title: "Fill Business Details",
    desc: "Provide your business/legal name, hotel or resort name, full address, and optional GST / registration numbers.",
    color: "bg-secondary/30",
    border: "border-border",
    iconColor: "text-muted-foreground",
  },
  {
    step: "03",
    icon: FileText,
    title: "Upload KYC Documents",
    desc: "Upload identity proof such as Aadhar Card, PAN Card, Passport, or Business Registration Certificate (JPG/PNG/PDF, max 5 MB).",
    color: "bg-secondary/30",
    border: "border-border",
    iconColor: "text-muted-foreground",
  },
  {
    step: "04",
    icon: Clock3,
    title: "Application Under Review",
    desc: "Our partner verification team reviews your submission within 24–48 hours. You will receive an email update on progress.",
    color: "bg-secondary/30",
    border: "border-border",
    iconColor: "text-muted-foreground",
  },
  {
    step: "05",
    icon: BadgeCheck,
    title: "Get Approved & Go Live",
    desc: "Once approved, your property will be mapped to your account. Start receiving bookings and track revenue from your owner dashboard.",
    color: "bg-secondary/30",
    border: "border-border",
    iconColor: "text-muted-foreground",
  },
];

const OwnerPortal = () => {
  const { user, setUser } = useBooking();
  const navigate = useNavigate();
  const token = localStorage.getItem("luxe_customer_token");

  const [appStatus, setAppStatus] = useState<string>("not_applied");
  const [appDetails, setAppDetails] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  
  const [loading, setLoading] = useState(() => !!localStorage.getItem("luxe_customer_token"));
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [authOpen, setAuthOpen] = useState(false);

  // Form fields
  const [businessName, setBusinessName] = useState("");
  const [hotelName, setHotelName] = useState("");
  const [hotelAddress, setHotelAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState("");
  const [docType, setDocType] = useState("aadhar");
  const [files, setFiles] = useState<FileList | null>(null);
  const [fileError, setFileError] = useState("");

  // Diagnostics log & State resolver
  useEffect(() => {
    const activeToken = localStorage.getItem("luxe_customer_token");
    console.log("[OwnerPortal Diagnostics]", {
      currentUser: user ? { name: user.name, email: user.email } : null,
      currentRole: user?.role,
      isAuthenticated: !!user && !!activeToken,
      applicationStatus: appStatus,
    });

    if (user && activeToken) {
      fetchApplicationStatus();
    } else {
      setAppStatus("not_applied");
      setAppDetails(null);
      setDashboardData(null);
    }
  }, [user]);

  const fetchApplicationStatus = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/owners/application-status");
      const data = res.data;
      setAppStatus(data.status || "not_applied");
      setAppDetails(data.application || null);

      if (user?.role === "owner" || data.status === "approved") {
        await loadDashboard();
      }
    } catch (err: any) {
      setError(err.message || "Failed to load application status.");
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = async () => {
    try {
      const res = await api.get("/owners/dashboard");
      setDashboardData(res.data?.data);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files;
    if (!f?.length) return;
    const err = validateFiles(f);
    if (err) { setFileError(err); return; }
    setFileError("");
    setFiles(f);
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !hotelName.trim() || !hotelAddress.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!files || files.length === 0) {
      setFileError("Please upload at least one KYC document.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("businessName", businessName);
      fd.append("hotelName", hotelName);
      fd.append("hotelAddress", hotelAddress);
      fd.append("gstNumber", gstNumber);
      fd.append("businessRegistrationNumber", businessRegistrationNumber);
      fd.append("docType", docType);
      Array.from(files).forEach((f) => fd.append("documents", f));

      await api.post("/owners/apply", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setSuccess("Application submitted successfully!");
      setFiles(null);
      await fetchApplicationStatus();
    } catch (err: any) {
      setError(err.message || "Failed to submit application.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    navigate("/");
  };

  // Render loading state
  if (loading && !dashboardData && appStatus === "not_applied") {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </Layout>
    );
  }

  // ── 1. If not logged in: Show auth check / landing page ──
  if (!token) {
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
              <button onClick={() => setAuthOpen(true)}
                className="flex items-center gap-2 bg-primary-foreground text-primary font-semibold px-8 py-3.5 rounded-xl hover:bg-primary-foreground/90 transition-base text-sm">
                Get Started / List Your Property <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="container py-16">
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 mb-16">
            {[
              { icon: Globe, title: "Global Reach", text: "Connect with travelers from 45+ countries browsing LuxeStay daily." },
              { icon: TrendingUp, title: "Real-Time Revenue", text: "Track bookings and earnings live from your owner dashboard." },
              { icon: ShieldCheck, title: "Secure KYC Onboarding", text: "Verified partner process ensures trust and safety for all." },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="bg-card border border-border rounded-2xl p-6 hover:shadow-elegant hover:border-accent/30 transition-base">
                <div className="w-11 h-11 rounded-xl bg-accent/10 grid place-items-center mb-4">
                  <Icon className="w-5 h-5 text-accent" />
                </div>
                <h3 className="font-semibold text-primary mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{text}</p>
              </div>
            ))}
          </div>

          {/* How It Works / Process Steps */}
          <div className="mb-4 text-center">
            <span className="inline-block bg-accent/10 text-accent text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full mb-3">
              How It Works
            </span>
            <h2 className="font-display text-3xl font-bold text-primary mb-2">Application Process</h2>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto mb-10">
              Becoming a LuxeStay property partner is simple. Follow these 5 steps to get your hotel listed and start earning.
            </p>
          </div>

          <div className="relative">
            {/* Connector line (desktop) */}
            <div className="hidden md:block absolute top-10 left-[10%] right-[10%] h-0.5 bg-border z-0" />

            <div className="grid sm:grid-cols-2 md:grid-cols-5 gap-5 relative z-10">
              {PROCESS_STEPS.map(({ step, icon: Icon, title, desc, color, border, iconColor }) => (
                <div key={step}
                  className={`${color} border ${border} rounded-2xl p-5 flex flex-col items-center text-center hover:scale-105 transition-transform duration-200`}>
                  <div className={`w-12 h-12 rounded-full bg-card border ${border} grid place-items-center mb-3 shadow-sm`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>
                  <span className="text-xs font-bold text-accent mb-1 tracking-widest">STEP {step}</span>
                  <h4 className="font-semibold text-primary text-sm mb-2 leading-snug">{title}</h4>
                  <p className="text-muted-foreground text-xs leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 text-center">
            <button onClick={() => setAuthOpen(true)}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-8 py-3.5 rounded-xl hover:bg-primary/90 transition-colors text-sm shadow-md">
              Start Your Application <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} defaultMode="signin" />
      </Layout>
    );
  }

  // ── 2. User role is Approved Owner: Show Owner Dashboard ──
  if (user?.role === "owner" && dashboardData) {
    const sc = { color: "text-green-700", bg: "bg-green-50 border-green-200", label: "Approved Partner" };
    return (
      <Layout>
        <div className="bg-gradient-to-br from-secondary via-background to-secondary/50 min-h-screen">
          <div className="container py-10 max-w-4xl">
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
              <div>
                <h1 className="font-display text-3xl font-bold">Owner Dashboard</h1>
                <p className="text-muted-foreground mt-1">Welcome back, {user?.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${sc.bg} ${sc.color}`}>
                  {sc.label}
                </span>
                <button onClick={handleSignOut} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                  Exit Owner Portal
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid sm:grid-cols-3 gap-4 mb-6">
              {[
                { label: "My Hotels", value: dashboardData?.stats?.totalHotels ?? 0, icon: Building2 },
                { label: "Total Bookings", value: dashboardData?.stats?.totalBookings ?? 0, icon: Users },
                { label: "Total Revenue", value: `$${(dashboardData?.stats?.totalRevenue ?? 0).toLocaleString()}`, icon: DollarSign },
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

            {/* Hotels */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-display text-xl font-bold mb-4">My Hotels</h2>
              {!dashboardData?.hotels?.length ? (
                <div className="text-center py-8">
                  <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground text-sm">No hotels yet.</p>
                  <p className="text-muted-foreground text-xs mt-1">Contact our admin team to map properties to your account.</p>
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

  // ── 3. Application is Pending Approval ──
  if (appStatus === "pending") {
    return (
      <Layout>
        <div className="container py-16 max-w-2xl">
          {/* Status Banner */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
            <h1 className="font-display text-3xl font-bold mb-3">Application Under Review</h1>
            <p className="text-muted-foreground mb-6">
              Your owner application is pending approval. Our partner verification team will review your business information and KYC documents shortly. You will receive an email notification once your application has been processed by the admin.
            </p>
          </div>

          {/* Application Details Summary */}
          <div className="bg-secondary/30 border border-border rounded-2xl p-5 mb-6 space-y-3 text-sm">
            <h3 className="font-semibold text-primary text-base mb-3 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-accent" /> Your Submitted Details
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Business Name</p>
                <p className="font-medium text-primary">{appDetails?.businessName || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Hotel / Resort Name</p>
                <p className="font-medium text-primary">{appDetails?.hotelName || "—"}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Hotel Address</p>
                <p className="font-medium text-primary">{appDetails?.hotelAddress || "—"}</p>
              </div>
              {appDetails?.gstNumber && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">GST Number</p>
                  <p className="font-medium text-primary">{appDetails.gstNumber}</p>
                </div>
              )}
              {appDetails?.businessRegistrationNumber && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Business Reg. No.</p>
                  <p className="font-medium text-primary">{appDetails.businessRegistrationNumber}</p>
                </div>
              )}
            </div>
            <div className="pt-2 border-t border-border">
              <p><strong>Status:</strong> <span className="text-yellow-600 font-semibold uppercase">Pending Review</span></p>
              {appDetails?.kycDocuments?.length > 0 && (
                <p className="mt-1"><strong>KYC Documents:</strong> <span className="text-green-600">{appDetails.kycDocuments.length} document(s) uploaded</span></p>
              )}
            </div>
          </div>

          {/* Process Steps (where they are) */}
          <div className="bg-card border border-border rounded-2xl p-5 mb-6">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">Where Are You In The Process?</h3>
            <div className="space-y-3">
              {PROCESS_STEPS.map(({ step, icon: Icon, title, iconColor, border }, idx) => {
                const isCompleted = idx < 3;
                const isActive = idx === 3;
                return (
                  <div key={step} className={`flex items-center gap-3 p-3 rounded-xl border ${isActive ? "border-amber-500/20 bg-amber-500/5" : isCompleted ? "border-green-500/20 bg-green-500/5" : "border-border bg-card/50"}`}>
                    <div className={`w-8 h-8 rounded-full grid place-items-center shrink-0 ${isCompleted ? "bg-green-100/80" : isActive ? "bg-amber-100/80" : "bg-secondary"}`}>
                      {isCompleted ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Icon className={`w-4 h-4 ${isActive ? "text-amber-500" : "text-muted-foreground"}`} />}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${isActive ? "text-amber-600" : isCompleted ? "text-green-700" : "text-muted-foreground"}`}>{title}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isCompleted ? "bg-green-100 text-green-700" : isActive ? "bg-amber-100 text-amber-700" : "bg-secondary text-muted-foreground"}`}>
                      {isCompleted ? "Done" : isActive ? "In Progress" : "Pending"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <button onClick={handleSignOut} className="text-sm text-muted-foreground hover:text-primary underline w-full text-center">
            Exit Owner Portal
          </button>
        </div>
      </Layout>
    );
  }

  // ── 4. Application is Rejected ──
  if (appStatus === "rejected") {
    return (
      <Layout>
        <div className="container py-20 max-w-xl text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-3">Application Not Approved</h1>
          <p className="text-muted-foreground mb-6">
            Unfortunately, your owner application could not be approved at this time.
          </p>
          {appDetails?.adminNotes && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 mb-6 text-left text-sm">
              <strong>Reason:</strong> {appDetails.adminNotes}
            </div>
          )}
          <button onClick={() => setAppStatus("not_applied")}
            className="bg-primary text-primary-foreground font-semibold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-colors text-sm w-full mb-3">
            Re-submit Application
          </button>
          <button onClick={handleSignOut} className="text-sm text-muted-foreground hover:text-primary underline">
            Exit Owner Portal
          </button>
        </div>
      </Layout>
    );
  }

  // ── 5. Default/Not Applied: Render Owner Application Form ──
  return (
    <Layout>
      <div className="bg-gradient-to-br from-secondary via-background to-secondary/30 min-h-screen py-12 px-4">
        {/* Process Steps bar above form */}
        <div className="container max-w-4xl mb-8">
          <div className="bg-card border border-border rounded-2xl p-5">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-accent" /> Application Process Overview
            </h2>
            <div className="grid sm:grid-cols-5 gap-3">
              {PROCESS_STEPS.map(({ step, icon: Icon, title, iconColor, border, color }, idx) => {
                const isActive = idx === 1 || idx === 2; // Steps 2 & 3 are active in the form
                return (
                  <div key={step} className={`flex flex-col items-center text-center p-3 rounded-xl border ${isActive ? "border-primary/30 bg-secondary/60" : "border-border bg-card/50"}`}>
                    <div className={`w-8 h-8 rounded-full grid place-items-center mb-1.5 ${isActive ? "bg-card border border-primary/20" : "bg-secondary"}`}>
                      {idx === 0 ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Icon className={`w-4 h-4 ${isActive ? "text-accent" : "text-muted-foreground"}`} />}
                    </div>
                    <span className={`text-[10px] font-bold tracking-widest ${isActive ? "text-accent" : "text-muted-foreground"}`}>STEP {step}</span>
                    <p className={`text-xs font-medium mt-0.5 ${isActive ? "text-primary font-semibold" : "text-muted-foreground"}`}>{title}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="container max-w-2xl bg-card border border-border rounded-3xl p-8 shadow-luxe">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 grid place-items-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">List Your Property</h1>
              <p className="text-muted-foreground text-sm">Apply to become a verified LuxeStay property partner.</p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-xl mb-6">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2 p-4 bg-green-50 border border-green-200 rounded-xl mb-6">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <p className="text-green-700 text-sm">{success}</p>
            </div>
          )}

          <form onSubmit={handleApply} className="space-y-6">
            {/* Prefilled and read-only customer info */}
            <div className="bg-secondary/40 rounded-2xl p-5 border border-border space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Account Information</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Full Name</label>
                  <input type="text" value={user?.name || ""} disabled
                    className="w-full bg-secondary/80 border border-border rounded-xl px-4 py-2.5 text-sm text-muted-foreground cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Email Address</label>
                  <input type="email" value={user?.email || ""} disabled
                    className="w-full bg-secondary/80 border border-border rounded-xl px-4 py-2.5 text-sm text-muted-foreground cursor-not-allowed" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Phone Number</label>
                <input type="text" value={user?.phone || ""} disabled
                  className="w-full bg-secondary/80 border border-border rounded-xl px-4 py-2.5 text-sm text-muted-foreground cursor-not-allowed" />
              </div>
            </div>

            {/* Owner specific information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Property & Business Details</h3>
              
              <div>
                <label className="block text-sm font-medium mb-1.5">Business / Legal Name *</label>
                <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required
                  placeholder="e.g. Grand Hospitality Ltd"
                  className="w-full border border-border bg-background rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Hotel / Resort Name *</label>
                  <input type="text" value={hotelName} onChange={(e) => setHotelName(e.target.value)} required
                    placeholder="e.g. Luxe Garden Resort"
                    className="w-full border border-border bg-background rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Hotel Address *</label>
                  <input type="text" value={hotelAddress} onChange={(e) => setHotelAddress(e.target.value)} required
                    placeholder="e.g. 123 Beach Rd, Goa"
                    className="w-full border border-border bg-background rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">GST Number (Optional)</label>
                  <input type="text" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)}
                    placeholder="22AAAAA0000A1Z5"
                    className="w-full border border-border bg-background rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Business Reg. No. (Optional)</label>
                  <input type="text" value={businessRegistrationNumber} onChange={(e) => setBusinessRegistrationNumber(e.target.value)}
                    placeholder="U12345GA2026PTC123"
                    className="w-full border border-border bg-background rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
            </div>

            {/* KYC Documents */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">KYC Verification Documents</h3>
              
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

              <div className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${fileError ? "border-destructive bg-destructive/5" : "border-border hover:border-accent"}`}>
                <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-1">Drag files here or click to select</p>
                <p className="text-xs text-muted-foreground mb-3">JPG, PNG, WEBP or PDF — max {MAX_SIZE_MB}MB</p>
                <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
                  multiple onChange={handleFileChange}
                  className="text-sm text-primary cursor-pointer mx-auto block" />
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
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm shadow-md">
              {loading ? <><Loader2 className="w-4.5 h-4.5 animate-spin" /> Submitting...</> : <><Upload className="w-4.5 h-4.5" /> Submit application</>}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default OwnerPortal;
