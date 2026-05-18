import { useState } from "react";
import { useNavigate } from "react-react-dom"; // wait, it's react-router-dom!
import { User, Lock, Loader2, Hotel } from "lucide-react";
import axios from "axios";
// fix import
import { Link } from "react-router-dom";

export default function StaffLogin() {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Assuming api baseUrl is setup in axios instance, or we can use full url
      const res = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/staff/login`, { name, pin });
      if (res.data.success) {
        localStorage.setItem("luxe_staff_token", res.data.token);
        localStorage.setItem("luxe_staff", JSON.stringify(res.data.data));
        navigate("/staff/dashboard");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed. Check your Name and PIN.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 relative overflow-hidden text-bright font-sans">
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-emerald/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mb-6 shadow-2xl">
            <Hotel className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 mb-2">
            Staff Portal
          </h1>
          <p className="text-dim text-sm">Sign in to view your housekeeping tasks</p>
        </div>

        <form onSubmit={handleLogin} className="glass-card p-8 rounded-3xl space-y-6">
          {error && (
            <div className="bg-ruby/10 border border-ruby/20 text-ruby text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="relative">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted mb-1.5 block">Staff Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                  placeholder="e.g. Maria Santos"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 outline-none focus:border-primary transition-colors text-bright placeholder:text-white/20" />
              </div>
            </div>

            <div className="relative">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted mb-1.5 block">4-Digit PIN</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} required
                  placeholder="****" maxLength={4}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 outline-none focus:border-primary transition-colors text-bright placeholder:text-white/20" />
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(var(--color-primary),0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In to Portal"}
          </button>
        </form>
      </div>
    </div>
  );
}
