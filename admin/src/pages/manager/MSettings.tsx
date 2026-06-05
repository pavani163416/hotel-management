import { useState, useEffect } from "react";
import { Moon, Sun, Bell, BellOff, KeyRound, Check, Loader2, AlertCircle } from "lucide-react";
import ManagerLayout from "@/components/ManagerLayout";
import { useAdmin } from "@/context/AdminContext";
import { API } from "@/services/api";

export default function MSettings() {
  const { admin: manager, token, theme, setTheme } = useAdmin();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const savedNotifications = localStorage.getItem("notificationsEnabled");
    const notifSaved = savedNotifications !== null ? JSON.parse(savedNotifications) : true;
    setNotificationsEnabled(notifSaved);
  }, []);

  const handleToggleDarkMode = (isDark: boolean) => {
    setTheme(isDark ? "dark" : "light");
  };

  const handleToggleNotifications = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    localStorage.setItem("notificationsEnabled", JSON.stringify(enabled));
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    // Validation
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError("All fields are required");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    if (!/[A-Z]/.test(passwordForm.newPassword)) {
      setPasswordError("Password must contain at least one uppercase letter");
      return;
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(passwordForm.newPassword)) {
      setPasswordError("Password must contain at least one special character");
      return;
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordError("New password must be different from current password");
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await fetch(`${API}/manager/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          oldPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPasswordError(data.message || "Failed to change password");
      } else {
        setPasswordSuccess(true);
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setTimeout(() => setPasswordSuccess(false), 3000);
      }
    } catch (err) {
      setPasswordError("Error changing password. Please try again.");
      console.error(err);
    } finally {
      setPasswordLoading(false);
    }
  };

  const isDark = theme === "dark";

  return (
    <ManagerLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className={`text-2xl font-bold ${isDark ? "text-bright" : "text-gray-900"}`}>Settings</h1>
          <p className={`text-sm mt-0.5 ${isDark ? "text-dim" : "text-gray-600"}`}>Manage your account preferences</p>
        </div>

        <div className="space-y-6">
          {/* Dark/Light Mode Card */}
          <div 
            className={`rounded-2xl p-6 transition-all ${isDark ? "glass-card hover:shadow-2xl" : "bg-white shadow-lg hover:shadow-xl"}`}
            style={isDark ? {} : { border: "1px solid #e2e8f0" }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div 
                  className="w-12 h-12 rounded-xl grid place-items-center shrink-0"
                  style={isDark ? { background: "linear-gradient(135deg, rgba(212,168,67,0.2) 0%, rgba(212,168,67,0.08) 100%)", border: "1px solid rgba(212,168,67,0.3)" } : { background: "#fef3c7", border: "1px solid #fcd34d" }}
                >
                  {isDark ? (
                    <Moon className="w-6 h-6 text-gold" />
                  ) : (
                    <Sun className="w-6 h-6 text-amber-600" />
                  )}
                </div>
                <div>
                  <h3 className={`font-semibold ${isDark ? "text-bright" : "text-gray-900"}`}>Theme</h3>
                  <p className={`text-sm mt-1 ${isDark ? "text-dim" : "text-gray-600"}`}>Choose between light and dark mode</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => handleToggleDarkMode(false)}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${!isDark ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"}`}
              >
                <Sun className="w-4 h-4" /> Light Mode
              </button>
              <button
                onClick={() => handleToggleDarkMode(true)}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${isDark ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"}`}
              >
                <Moon className="w-4 h-4" /> Dark Mode
              </button>
            </div>
          </div>

          {/* Notifications Card */}
          <div 
            className={`rounded-2xl p-6 transition-all ${isDark ? "glass-card hover:shadow-2xl" : "bg-white shadow-lg hover:shadow-xl"}`}
            style={isDark ? {} : { border: "1px solid #e2e8f0" }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div 
                  className="w-12 h-12 rounded-xl grid place-items-center shrink-0"
                  style={isDark ? { background: "linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.08) 100%)", border: "1px solid rgba(16,185,129,0.3)" } : { background: "#d1fae5", border: "1px solid #6ee7b7" }}
                >
                  {notificationsEnabled ? (
                    <Bell className={`w-6 h-6 ${isDark ? "text-green-400" : "text-green-600"}`} />
                  ) : (
                    <BellOff className={`w-6 h-6 ${isDark ? "text-gray-400" : "text-gray-600"}`} />
                  )}
                </div>
                <div>
                  <h3 className={`font-semibold ${isDark ? "text-bright" : "text-gray-900"}`}>Notifications</h3>
                  <p className={`text-sm mt-1 ${isDark ? "text-dim" : "text-gray-600"}`}>
                    {notificationsEnabled ? "You are receiving notifications" : "Notifications are turned off"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => handleToggleNotifications(true)}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${notificationsEnabled ? (isDark ? "bg-bright text-gray-900" : "bg-blue-500 text-white") : (isDark ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700")}`}
              >
                <Bell className="w-4 h-4" /> Turn On
              </button>
              <button
                onClick={() => handleToggleNotifications(false)}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${!notificationsEnabled ? (isDark ? "bg-bright text-gray-900" : "bg-red-500 text-white") : (isDark ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700")}`}
              >
                <BellOff className="w-4 h-4" /> Turn Off
              </button>
            </div>
          </div>

          {/* Change Password Card */}
          <div 
            className={`rounded-2xl p-6 transition-all ${isDark ? "glass-card hover:shadow-2xl" : "bg-white shadow-lg hover:shadow-xl"}`}
            style={isDark ? {} : { border: "1px solid #e2e8f0" }}
          >
            <div className="flex items-start gap-4 mb-6">
              <div 
                className="w-12 h-12 rounded-xl grid place-items-center shrink-0"
                style={isDark ? { background: "linear-gradient(135deg, rgba(192,57,43,0.2) 0%, rgba(192,57,43,0.08) 100%)", border: "1px solid rgba(192,57,43,0.3)" } : { background: "#fee2e2", border: "1px solid #fca5a5" }}
              >
                <KeyRound className={`w-6 h-6 ${isDark ? "text-red-400" : "text-red-600"}`} />
              </div>
              <div>
                <h3 className={`font-semibold ${isDark ? "text-bright" : "text-gray-900"}`}>Change Password</h3>
                <p className={`text-sm mt-1 ${isDark ? "text-dim" : "text-gray-600"}`}>Update your account password</p>
              </div>
            </div>

            {passwordSuccess && (
              <div 
                className="mb-4 p-3 rounded-lg flex items-start gap-3"
                style={isDark ? { background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" } : { background: "#d1fae5", border: "1px solid #6ee7b7" }}
              >
                <Check className={`w-5 h-5 mt-0.5 shrink-0 ${isDark ? "text-green-400" : "text-green-600"}`} />
                <div>
                  <p className={`text-sm font-medium ${isDark ? "text-green-200" : "text-green-800"}`}>Password changed successfully!</p>
                </div>
              </div>
            )}

            {passwordError && (
              <div 
                className="mb-4 p-3 rounded-lg flex items-start gap-3"
                style={isDark ? { background: "rgba(192,57,43,0.1)", border: "1px solid rgba(192,57,43,0.3)" } : { background: "#fee2e2", border: "1px solid #fca5a5" }}
              >
                <AlertCircle className={`w-5 h-5 mt-0.5 shrink-0 ${isDark ? "text-red-400" : "text-red-600"}`} />
                <div>
                  <p className={`text-sm font-medium ${isDark ? "text-red-200" : "text-red-800"}`}>{passwordError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* Current Password */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-soft" : "text-gray-700"}`}>
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    placeholder="Enter your current password"
                    className={`w-full px-4 py-2.5 rounded-lg transition-all focus:outline-none ${isDark ? "bg-gray-800 text-bright placeholder-gray-500 border border-gray-700 focus:border-gold focus:bg-gray-850" : "bg-gray-50 text-gray-900 placeholder-gray-500 border border-gray-300 focus:border-blue-500 focus:bg-white"}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm ${isDark ? "text-gray-400 hover:text-gray-300" : "text-gray-600 hover:text-gray-700"}`}
                  >
                    {showCurrentPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-soft" : "text-gray-700"}`}>
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Enter your new password"
                    className={`w-full px-4 py-2.5 rounded-lg transition-all focus:outline-none ${isDark ? "bg-gray-800 text-bright placeholder-gray-500 border border-gray-700 focus:border-gold focus:bg-gray-850" : "bg-gray-50 text-gray-900 placeholder-gray-500 border border-gray-300 focus:border-blue-500 focus:bg-white"}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm ${isDark ? "text-gray-400 hover:text-gray-300" : "text-gray-600 hover:text-gray-700"}`}
                  >
                    {showNewPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-soft" : "text-gray-700"}`}>
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Confirm your new password"
                    className={`w-full px-4 py-2.5 rounded-lg transition-all focus:outline-none ${isDark ? "bg-gray-800 text-bright placeholder-gray-500 border border-gray-700 focus:border-gold focus:bg-gray-850" : "bg-gray-50 text-gray-900 placeholder-gray-500 border border-gray-300 focus:border-blue-500 focus:bg-white"}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm ${isDark ? "text-gray-400 hover:text-gray-300" : "text-gray-600 hover:text-gray-700"}`}
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={passwordLoading}
                className={`w-full px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${isDark ? "bg-gold hover:bg-yellow-500 text-gray-900 disabled:bg-gray-700 disabled:text-gray-400" : "bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-300 disabled:text-gray-600"}`}
              >
                {passwordLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    Change Password
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </ManagerLayout>
  );
}
