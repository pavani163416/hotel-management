import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, Check, AlertCircle, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import api from "@/services/api";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const nav = useNavigate();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const validate = () => {
    if (!password) return "Password is required.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(password)) return "Password must contain at least one capital letter.";
    if (password !== confirmPassword) return "Passwords do not match.";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const vErr = validate();
    if (vErr) {
      setError(vErr);
      return;
    }

    setError("");
    setLoading(true);

    try {
      await api.post("/auth/reset-password", {
        email: email.trim().toLowerCase(),
        token,
        password,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container py-16 max-w-md flex flex-col justify-center min-h-[60vh]">
        <div className="bg-card border border-border rounded-2xl p-8 space-y-6 shadow-xl relative overflow-hidden">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="font-display text-2xl font-bold">Reset Password</h1>
            <p className="text-sm text-muted-foreground">
              Please enter your new password below.
            </p>
          </div>

          {success ? (
            <div className="space-y-4 py-4 text-center animate-in fade-in zoom-in-95">
              <div className="w-12 h-12 bg-emerald/10 text-emerald rounded-full flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <p className="font-semibold text-primary">Password Reset Successfully!</p>
              <p className="text-xs text-muted-foreground">
                Your password has been successfully updated. You can now close this page or return home to sign in.
              </p>
              <button
                onClick={() => nav("/")}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-semibold transition-base"
              >
                Go to Home
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5 relative">
                <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-10 border border-border rounded-xl bg-transparent outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 relative">
                <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-10 border border-border rounded-xl bg-transparent outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-1 pt-1">
                <p className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${password.length >= 8 ? "bg-emerald" : "bg-muted-foreground"}`}></span>
                  At least 8 characters
                </p>
                <p className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(password) ? "bg-emerald" : "bg-muted-foreground"}`}></span>
                  At least 1 uppercase letter
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-xl text-xs animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !token || !email}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-base mt-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? "Updating..." : "Reset Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ResetPassword;
