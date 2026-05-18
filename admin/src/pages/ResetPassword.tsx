import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Lock, Mail, Shield } from "lucide-react";
import { resetPassword } from "@/services/api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const emailParam = searchParams.get("email") || "";
    const tokenParam = searchParams.get("token") || "";
    setEmail(decodeURIComponent(emailParam));
    setToken(tokenParam);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email || !token || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword({ email, token, password });
      setMessage("Password reset successfully. You can now sign in.");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err?.message || "Unable to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #07101e 0%, #0a1628 50%, #0d1e35 100%)" }}>
      <div className="relative w-full max-w-md">
        <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(8,16,36,0.95)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 32px 80px rgba(0,0,0,0.6)", backdropFilter: "blur(20px)" }}>
          <div className="px-8 py-10">
            <div className="flex items-center gap-3 mb-8">
              <button type="button" onClick={() => navigate("/login")}
                className="text-sm text-gold transition-colors hover:text-yellow-300">
                <ArrowLeft className="inline-block w-4 h-4 mr-1" /> Back to sign in
              </button>
            </div>
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 rounded-2xl grid place-items-center mb-4"
                style={{ background: "linear-gradient(135deg, rgba(212,168,67,0.18) 0%, rgba(212,168,67,0.08) 100%)", border: "1px solid rgba(212,168,67,0.28)" }}>
                <Shield className="w-7 h-7 text-gold" />
              </div>
              <h1 className="text-xl font-bold text-bright">Reset your password</h1>
              <p className="text-sm text-dim mt-1 text-center">Enter a new password for your account.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-dim uppercase tracking-wider mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@luxestay.com"
                    className="w-full rounded-xl px-12 py-3 bg-slate-950/70 text-white border border-white/10 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dim uppercase tracking-wider mb-1.5">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl px-12 py-3 bg-slate-950/70 text-white border border-white/10 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dim uppercase tracking-wider mb-1.5">Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full rounded-xl px-4 py-3 bg-slate-950/70 text-white border border-white/10 outline-none"
                />
              </div>

              {error && (
                <div className="text-sm px-4 py-3 rounded-xl" style={{ background: "rgba(225,29,72,0.12)", border: "1px solid rgba(225,29,72,0.25)", color: "#e11d48" }}>
                  {error}
                </div>
              )}

              {message && (
                <div className="text-sm px-4 py-3 rounded-xl" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", color: "#047857" }}>
                  {message}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-70"
                style={{ background: "linear-gradient(135deg, #c0392b 0%, #a93226 100%)" }}>
                {loading ? "Resetting password..." : "Reset Password"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
