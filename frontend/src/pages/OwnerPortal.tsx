import { useState } from "react";
import { Building2, Upload, CheckCircle2, AlertCircle, Loader2, LogIn, FileText } from "lucide-react";
import Layout from "@/components/Layout";
import api from "@/services/api";

type OwnerView = "login" | "register" | "verify" | "dashboard";

const OwnerPortal = () => {
  const [view, setView] = useState<OwnerView>("login");
  const [token, setToken] = useState<string | null>(null);
  const [ownerData, setOwnerData] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);

  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handle = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const doRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await api.post("/owners/register", form);
      setSuccess("Registration successful! Check your email for a verification code.");
      setView("verify");
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed.");
    } finally { setLoading(false); }
  };

  const doVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await api.post("/owners/verify-email", { email: form.email, otp });
      setSuccess("Email verified! You can now log in.");
      setView("login");
    } catch (err: any) {
      setError(err.response?.data?.message || "Verification failed.");
    } finally { setLoading(false); }
  };

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res: any = await api.post("/owners/login", { email: form.email, password: form.password });
      const d = res.data?.data;
      setToken(d.token);
      setOwnerData(d);
      // Fetch dashboard
      const dash: any = await api.get("/owners/dashboard", {
        headers: { Authorization: `Bearer ${d.token}` },
      } as any);
      setDashboardData(dash.data?.data);
      setView("dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed.");
    } finally { setLoading(false); }
  };

  if (view === "dashboard" && ownerData) {
    const statusColor = ownerData.status === "approved" ? "text-green-600 bg-green-50" :
      ownerData.status === "rejected" ? "text-red-600 bg-red-50" :
      ownerData.status === "suspended" ? "text-orange-600 bg-orange-50" :
      "text-yellow-600 bg-yellow-50";

    return (
      <Layout>
        <div className="container py-10 max-w-4xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-3xl font-bold">Owner Dashboard</h1>
              <p className="text-muted-foreground mt-1">Welcome back, {ownerData.name}</p>
            </div>
            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize ${statusColor}`}>
              {ownerData.status}
            </span>
          </div>

          {ownerData.status === "pending" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 mb-6 flex gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-800">Application under review</p>
                <p className="text-yellow-700 text-sm mt-1">Our team is reviewing your application. You'll be notified once approved.</p>
              </div>
            </div>
          )}

          {/* Stats */}
          {dashboardData && (
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              {[
                { label: "Hotels", value: dashboardData.stats?.totalHotels ?? 0 },
                { label: "Bookings", value: dashboardData.stats?.totalBookings ?? 0 },
                { label: "Revenue", value: `$${(dashboardData.stats?.totalRevenue ?? 0).toLocaleString()}` },
              ].map((s) => (
                <div key={s.label} className="bg-card border border-border rounded-2xl p-5 text-center">
                  <p className="font-display text-3xl font-bold text-primary">{s.value}</p>
                  <p className="text-muted-foreground text-sm mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* KYC Upload */}
          {ownerData.kycStatus === "not_submitted" && (
            <div className="bg-card border border-border rounded-2xl p-6 mb-6">
              <h2 className="font-display text-xl font-bold mb-2">Complete KYC Verification</h2>
              <p className="text-muted-foreground text-sm mb-4">Upload your identity and business documents to get approved.</p>
              <KYCUpload token={token!} onDone={() => setOwnerData({ ...ownerData, kycStatus: "pending" })} />
            </div>
          )}

          {/* Hotels */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-display text-xl font-bold mb-4">My Hotels</h2>
            {dashboardData?.hotels?.length === 0 ? (
              <p className="text-muted-foreground text-sm">No hotels yet. Contact admin to add your property.</p>
            ) : (
              <div className="space-y-3">
                {dashboardData?.hotels?.map((h: any) => (
                  <div key={h.id} className="flex items-center justify-between p-4 border border-border rounded-xl">
                    <div>
                      <p className="font-semibold text-primary">{h.name}</p>
                      <p className="text-muted-foreground text-sm">{h.location}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${h.isActive ? "bg-green-50 text-green-600" : "bg-secondary text-muted-foreground"}`}>
                      {h.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => { setToken(null); setOwnerData(null); setView("login"); }}
            className="mt-6 text-sm text-muted-foreground hover:text-destructive transition-colors">
            Sign out
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-gradient-to-br from-secondary via-background to-secondary/50 min-h-[80vh] flex items-center justify-center px-4 py-16">
        <div className="bg-card border border-border rounded-2xl p-8 w-full max-w-md shadow-luxe">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 grid place-items-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold">Owner Portal</h1>
              <p className="text-muted-foreground text-xs">Manage your hotel properties</p>
            </div>
          </div>

          {error && <p className="text-destructive text-sm mb-4 p-3 bg-destructive/10 rounded-lg">{error}</p>}
          {success && <p className="text-green-700 text-sm mb-4 p-3 bg-green-50 rounded-lg">{success}</p>}

          {view === "login" && (
            <form onSubmit={doLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Email</label>
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
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                {loading ? "Signing in..." : "Sign In"}
              </button>
              <p className="text-center text-sm text-muted-foreground">
                New owner?{" "}
                <button type="button" onClick={() => { setView("register"); setError(""); setSuccess(""); }}
                  className="text-primary font-semibold hover:underline">Register here</button>
              </p>
            </form>
          )}

          {view === "register" && (
            <form onSubmit={doRegister} className="space-y-4">
              {[
                { label: "Full Name", key: "name", type: "text" },
                { label: "Email", key: "email", type: "email" },
                { label: "Phone", key: "phone", type: "tel" },
                { label: "Password", key: "password", type: "password" },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-sm font-medium mb-1.5">{label}</label>
                  <input type={type} value={form[key as keyof typeof form]} onChange={(e) => handle(key, e.target.value)}
                    className="w-full px-4 py-2.5 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm" required />
                </div>
              ))}
              <button type="submit" disabled={loading}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-60">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Registering...</> : "Create Owner Account"}
              </button>
              <p className="text-center text-sm text-muted-foreground">
                Already registered?{" "}
                <button type="button" onClick={() => { setView("login"); setError(""); setSuccess(""); }}
                  className="text-primary font-semibold hover:underline">Sign in</button>
              </p>
            </form>
          )}

          {view === "verify" && (
            <form onSubmit={doVerifyEmail} className="space-y-4">
              <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to <strong>{form.email}</strong></p>
              <input type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000" maxLength={6}
                className="w-full px-4 py-3 border border-border rounded-xl outline-none text-center text-2xl tracking-[0.5em] font-semibold focus:ring-2 focus:ring-primary" required />
              <button type="submit" disabled={loading}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-60">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {loading ? "Verifying..." : "Verify Email"}
              </button>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
};

const KYCUpload = ({ token, onDone }: { token: string; onDone: () => void }) => {
  const [files, setFiles] = useState<FileList | null>(null);
  const [docType, setDocType] = useState("aadhar");
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files?.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("docType", docType);
      Array.from(files).forEach((f) => fd.append("documents", f));
      await fetch("/api/owners/kyc-documents", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      setDone(true);
      onDone();
    } catch { /* non-blocking */ } finally { setUploading(false); }
  };

  if (done) {
    return (
      <div className="flex items-center gap-2 text-green-700">
        <CheckCircle2 className="w-5 h-5" />
        <span className="text-sm font-medium">Documents submitted for review.</span>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <select value={docType} onChange={(e) => setDocType(e.target.value)}
        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary bg-background">
        <option value="aadhar">Aadhar Card</option>
        <option value="pan">PAN Card</option>
        <option value="passport">Passport</option>
        <option value="business_reg">Business Registration</option>
      </select>
      <div className="border-2 border-dashed border-border rounded-xl p-4 text-center">
        <FileText className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
        <input type="file" accept="image/*,.pdf" multiple onChange={(e) => setFiles(e.target.files)} className="text-sm" />
      </div>
      <button type="submit" disabled={uploading || !files?.length}
        className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
        {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Submit Documents</>}
      </button>
    </form>
  );
};

export default OwnerPortal;
