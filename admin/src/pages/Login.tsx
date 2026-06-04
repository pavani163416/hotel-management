import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Mail, Lock, Eye, EyeOff, ArrowRight, Shield } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { API } from "@/services/api";

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
  const [showSupportModal, setShowSupportModal] = useState(false);

  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || "admin@luxestay.com";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please enter email and password."); return; }
    setLoading(true);

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
        // If manager must change password, redirect to change-password page first
        if (d.mustChangePassword) {
          navigate("/m/change-password");
        } else {
          navigate("/m/dashboard");
        }
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

    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: resetEmail.trim().toLowerCase(),
          fromAdmin: true,
          originUrl: window.location.origin
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResetMessage("Check your inbox! A password reset link has been sent.");
      } else {
        setResetError(data?.message || "Unable to send password reset email.");
      }
    } catch {
      setResetError("Unable to connect to server. Please try again.");
    } finally {
      setResetLoading(false);
    }
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
              <h1 className="text-xl font-bold text-bright">
                {resetMode ? "Reset Password" : "Sign in to Platform"}
              </h1>
              <p className="text-sm text-dim mt-1 text-center">
                {resetMode 
                  ? "Enter your email to receive a password reset link" 
                  : "LuxeStay Multi-Hotel Platform Management"
                }
              </p>
            </div>

            {resetMode ? (
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-dim uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    <input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="admin@luxestay.com"
                      className="w-full bg-white/[0.04] border border-white/10 text-[#f0f4ff] rounded-xl py-3 pl-10 pr-4 text-sm outline-none placeholder-slate-500 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 transition-all"
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
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@luxestay.com"
                      className="w-full bg-white/[0.04] border border-white/10 text-[#f0f4ff] rounded-xl py-3 pl-10 pr-4 text-sm outline-none placeholder-slate-500 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
                    <button type="button" className="text-xs text-gold transition-colors hover:text-yellow-300 cursor-pointer px-2 py-1 rounded hover:bg-white/5"
                      onClick={(e) => { e.preventDefault(); setResetMode(true); setResetEmail(email); setResetMessage(""); setResetError(""); }}>
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    <input type={showPw ? "text" : "password"} value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white/[0.04] border border-white/10 text-[#f0f4ff] rounded-xl py-3 pl-10 pr-12 text-sm outline-none placeholder-slate-500 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 transition-all"
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors z-10 cursor-pointer flex items-center justify-center">
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
                <button
                  type="button"
                  onClick={() => setShowSupportModal(true)}
                  className="text-gold transition-colors"
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#e8c96a"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#d4a843"}
                >
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

      {/* Static Contact Admin Popup */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl border p-8 shadow-2xl relative"
            style={{
              background: "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)",
              borderColor: "rgba(255,255,255,0.05)",
            }}
          >
            <div className="flex flex-col items-center text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-lg"
                style={{
                  background: "linear-gradient(135deg, rgba(212,168,67,0.15) 0%, rgba(212,168,67,0.05) 100%)",
                  border: "1px solid rgba(212,168,67,0.2)",
                }}
              >
                <Mail className="w-8 h-8 text-gold" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2 tracking-wide">Contact System Admin</h2>
              <p className="text-sm text-slate-400 mb-8 max-w-sm">
                If you need assistance with the administrative portal, please reach out to our dedicated support team using the details below.
              </p>
              
              <div className="w-full space-y-4 text-left">
                <div className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/5">
                  <Mail className="w-5 h-5 text-gold flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-0.5">Email Support</p>
                    <p className="text-sm font-semibold text-white">{supportEmail}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/5">
                  <svg className="w-5 h-5 text-gold flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-0.5">Phone Support</p>
                    <p className="text-sm font-semibold text-white">+1 (800) 555-0199</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowSupportModal(false)}
                className="mt-8 px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-colors w-full"
                style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
                onMouseLeave={e => (e.currentTarget.style.background = "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)")}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
