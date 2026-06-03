import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, ShieldCheck, ArrowRight } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { API } from "@/services/api";

export default function MChangePassword() {
  const navigate = useNavigate();
  const { token, login, admin } = useAdmin();

  const [oldPassword, setOldPassword]     = useState("");
  const [newPassword, setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld]             = useState(false);
  const [showNew, setShowNew]             = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState("");
  const [success, setSuccess]             = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setError("New password must contain at least one uppercase letter.");
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      setError("New password must contain at least one special character.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/manager/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess("Password changed successfully! Redirecting to dashboard...");
        // Update the session with the new token (mustChangePassword: false)
        if (data.data?.token && admin) {
          login(admin, data.data.token);
        }
        setTimeout(() => {
          navigate("/m/dashboard");
        }, 1500);
      } else {
        setError(data.message || "Failed to change password. Please try again.");
      }
    } catch {
      setError("Unable to connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#f0f4ff",
    borderRadius: "12px",
    padding: "11px 14px 11px 40px",
    paddingRight: "44px",
    fontSize: "0.875rem",
    width: "100%",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  const PasswordField = ({
    label, value, onChange, show, onToggleShow, placeholder
  }: {
    label: string; value: string; onChange: (v: string) => void;
    show: boolean; onToggleShow: () => void; placeholder: string;
  }) => (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
        style={{ color: "#94a3b8" }}>
        {label}
      </label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#64748b" }} />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={inputStyle}
          onFocus={e => {
            e.currentTarget.style.borderColor = "rgba(212,168,67,0.5)";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(212,168,67,0.1)";
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
          style={{ color: "#64748b" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#94a3b8"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#64748b"}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #07101e 0%, #0a1628 50%, #0d1e35 100%)" }}
    >
      {/* Ambient glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #d4a843 0%, transparent 70%)" }} />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-8"
          style={{ background: "radial-gradient(circle, #c0392b 0%, transparent 70%)" }} />
      </div>

      <div className="relative w-full max-w-md">
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(17,34,64,0.95) 0%, rgba(13,26,48,0.95) 100%)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Amber top accent */}
          <div className="h-0.5 w-full"
            style={{ background: "linear-gradient(90deg, transparent 0%, #d4a843 50%, transparent 100%)" }} />

          <div className="px-8 py-8">
            {/* Icon + header */}
            <div className="flex flex-col items-center mb-8">
              <div
                className="w-14 h-14 rounded-2xl grid place-items-center mb-4"
                style={{
                  background: "linear-gradient(135deg, rgba(212,168,67,0.2) 0%, rgba(212,168,67,0.08) 100%)",
                  border: "1px solid rgba(212,168,67,0.35)",
                  boxShadow: "0 8px 24px rgba(212,168,67,0.15)",
                }}
              >
                <ShieldCheck className="w-7 h-7" style={{ color: "#d4a843" }} />
              </div>
              <h1 className="text-xl font-bold" style={{ color: "#f0f4ff" }}>
                Set Your New Password
              </h1>
              <p className="text-sm text-center mt-1" style={{ color: "#64748b" }}>
                Your account has a temporary password. Please set a new secure password to continue.
              </p>
            </div>

            {/* Security notice */}
            <div
              className="flex items-start gap-3 p-3 rounded-xl mb-6"
              style={{
                background: "rgba(212,168,67,0.08)",
                border: "1px solid rgba(212,168,67,0.2)",
              }}
            >
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#d4a843" }} />
              <p className="text-xs" style={{ color: "#d4a843" }}>
                Your password must be at least <strong>8 characters</strong> with one
                <strong> uppercase letter</strong> and one <strong>special character</strong>.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <PasswordField
                label="Current Temporary Password"
                value={oldPassword}
                onChange={setOldPassword}
                show={showOld}
                onToggleShow={() => setShowOld(!showOld)}
                placeholder="Enter your temporary password"
              />

              <PasswordField
                label="New Password"
                value={newPassword}
                onChange={setNewPassword}
                show={showNew}
                onToggleShow={() => setShowNew(!showNew)}
                placeholder="Create a strong password"
              />

              <PasswordField
                label="Confirm New Password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                show={showConfirm}
                onToggleShow={() => setShowConfirm(!showConfirm)}
                placeholder="Repeat new password"
              />

              {error && (
                <div
                  className="text-sm px-4 py-2.5 rounded-xl"
                  style={{ background: "rgba(225,29,72,0.12)", border: "1px solid rgba(225,29,72,0.25)", color: "#e11d48" }}
                >
                  {error}
                </div>
              )}

              {success && (
                <div
                  className="text-sm px-4 py-2.5 rounded-xl"
                  style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", color: "#10b981" }}
                >
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 mt-2 transition-all disabled:opacity-70"
                style={{
                  background: "linear-gradient(135deg, #c0392b 0%, #a93226 100%)",
                  boxShadow: "0 4px 16px rgba(192,57,43,0.35)",
                }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 24px rgba(192,57,43,0.5)"; }}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(192,57,43,0.35)"}
              >
                {loading
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><span>Update Password</span> <ArrowRight className="w-4 h-4" /></>
                }
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
