import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Mail, Lock, Eye, EyeOff, ArrowRight, Shield } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAdmin();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please enter email and password."); return; }
    setLoading(true);

    const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

    try {
      // ── Try manager login first ───────────────────────
      const managerRes = await fetch(`${API}/manager/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const managerData = await managerRes.json();
      if (managerRes.ok && managerData.success && managerData.data.role === "Manager") {
        const d = managerData.data;
        login(
          {
            name:              d.name,
            email:             d.email,
            role:              d.role,
            hotelId:           d.assignedHotelId,
            hotelName:         d.assignedHotelName,
            assignedHotelId:   d.assignedHotelId,
            assignedHotelName: d.assignedHotelName,
          },
          d.token
        );
        navigate("/m/dashboard");
        return;
      }

      // ── Fall back to admin login ──────────────────────
      const res = await fetch(`${API}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        login({ name: data.data.name, email: data.data.email, role: data.data.role }, data.data.token);
        navigate(data.data.role === "Manager" ? "/m/dashboard" : "/dashboard");
        return;
      }

      // Both failed — show error from the admin response
      setError(data?.message || "Invalid credentials.");
    } catch {
      setError("Unable to connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetMessage("");
    if (!resetEmail) {
      setResetError("Please enter your email address.");
      return;
    }

    setResetLoading(true);
    const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResetMessage("If an account exists for this email, a reset link has been sent.");
      } else {
        setResetError(data?.message || "Unable to send password reset email.");
      }
    } catch {
      setResetError("Unable to connect to server. Please try again.");
    } finally {
      setResetLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#f0f4ff",
    borderRadius: "12px",
    padding: "11px 14px 11px 40px",
    fontSize: "0.875rem",
    width: "100%",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #07101e 0%, #0a1628 50%, #0d1e35 100%)" }}>

      {/* Ambient glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #d4a843 0%, transparent 70%)" }} />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-8"
          style={{ background: "radial-gradient(circle, #c0392b 0%, transparent 70%)" }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(17,34,64,0.95) 0%, rgba(13,26,48,0.95) 100%)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)",
            backdropFilter: "blur(20px)",
          }}>

          {/* Top accent line */}
          <div className="h-0.5 w-full"
            style={{ background: "linear-gradient(90deg, transparent 0%, #d4a843 50%, transparent 100%)" }} />

          <div className="px-8 py-8">
            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 rounded-2xl grid place-items-center mb-4"
                style={{
                  background: "linear-gradient(135deg, rgba(212,168,67,0.2) 0%, rgba(212,168,67,0.08) 100%)",
                  border: "1px solid rgba(212,168,67,0.35)",
                  boxShadow: "0 8px 24px rgba(212,168,67,0.15)",
                }}>
                <Building2 className="w-7 h-7 text-gold" />
              </div>
              <h1 className="text-xl font-bold text-bright">Sign in to Platform</h1>
              <p className="text-sm text-dim mt-1 text-center">LuxeStay Multi-Hotel Platform Management</p>
            </div>

            {resetMode ? (
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-dim uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
                    <input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="admin@luxestay.com" style={inputStyle}
                      onFocus={e => { e.currentTarget.style.borderColor = "rgba(212,168,67,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(212,168,67,0.1)"; }}
                      onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
                    />
                  </div>
                </div>

                {resetError && (
                  <div className="text-sm px-4 py-2.5 rounded-xl"
                    style={{ background: "rgba(225,29,72,0.12)", border: "1px solid rgba(225,29,72,0.25)", color: "#e11d48" }}>
                    {resetError}
                  </div>
                )}
                {resetMessage && (
                  <div className="text-sm px-4 py-2.5 rounded-xl"
                    style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", color: "#047857" }}>
                    {resetMessage}
                  </div>
                )}

                <button type="submit" disabled={resetLoading}
                  className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 mt-2 transition-all disabled:opacity-70"
                  style={{
                    background: "linear-gradient(135deg, #0f766e 0%, #047857 100%)",
                    boxShadow: "0 4px 16px rgba(6,95,70,0.35)",
                  }}
                >
                  {resetLoading
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : "Send reset link"
                  }
                </button>

                <button type="button" onClick={() => {
                    setResetMode(false);
                    setResetEmail("");
                    setResetError("");
                    setResetMessage("");
                  }}
                  className="w-full py-3 rounded-xl font-semibold text-sm text-white border border-white/10 mt-2 transition-all"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  Back to sign in
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-dim uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@luxestay.com" style={inputStyle}
                      onFocus={e => { e.currentTarget.style.borderColor = "rgba(212,168,67,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(212,168,67,0.1)"; }}
                      onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-dim uppercase tracking-wider">Password</label>
                    <button type="button" className="text-xs text-gold transition-colors"
                      onClick={() => { setResetMode(true); setResetEmail(email); setResetMessage(""); setResetError(""); }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#e8c96a"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#d4a843"}>
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
                    <input type={showPw ? "text" : "password"} value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{ ...inputStyle, paddingRight: "40px" }}
                      onFocus={e => { e.currentTarget.style.borderColor = "rgba(212,168,67,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(212,168,67,0.1)"; }}
                      onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-dim transition-colors"
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#94a3b8"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#64748b"}>
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded" style={{ accentColor: "#c0392b" }} />
                  <span className="text-sm text-soft">Remember this device for 30 days</span>
                </label>

                {/* Error */}
                {error && (
                  <div className="text-sm px-4 py-2.5 rounded-xl"
                    style={{ background: "rgba(225,29,72,0.12)", border: "1px solid rgba(225,29,72,0.25)", color: "#e11d48" }}>
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 mt-2 transition-all disabled:opacity-70"
                  style={{
                    background: "linear-gradient(135deg, #c0392b 0%, #a93226 100%)",
                    boxShadow: "0 4px 16px rgba(192,57,43,0.35)",
                  }}
                  onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 24px rgba(192,57,43,0.5)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; } }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(192,57,43,0.35)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
                >
                  {loading
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <>Sign in to Dashboard <ArrowRight className="w-4 h-4" /></>
                  }
                </button>
              </form>
            )}

            {/* Demo hint */}
            <div className="mt-6 text-center">
              <p className="text-xs text-dim">
                Need technical assistance?{" "}
                <button className="text-gold transition-colors"
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#e8c96a"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#d4a843"}>
                  Contact System Admin
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom badges */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <div className="flex items-center gap-1.5 text-xs text-dim">
            <Shield className="w-3.5 h-3.5" />
            Enterprise Grade Security
          </div>
          <span className="text-dim">•</span>
          <span className="text-xs text-dim">V2.4.0-PRO</span>
        </div>
      </div>
    </div>
  );
}
