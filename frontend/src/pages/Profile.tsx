import { useState, useEffect } from "react";
import { User, Save, LogOut, Mail, CheckCircle2, Key } from "lucide-react";
import Layout from "@/components/Layout";
import { useBooking } from "@/context/BookingContext";
import { AuthModal } from "@/components/AuthModal";
import { createNotification, changePassword } from "@/services/api";
import { AssistanceModal } from "@/components/AssistanceModal";

const Profile = () => {
  const { user, setUser, bookings, selectedHotel } = useBooking();
  const [form, setForm] = useState(user || { name: "", email: "", phone: "", city: "" });
  const [saved, setSaved] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [requesting, setRequesting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [assistanceOpen, setAssistanceOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => { if (user) setForm(user); }, [user]);

  const openAuth = (mode: "signin" | "signup") => { setAuthMode(mode); setAuthOpen(true); };

  const normalizeDate = (value?: string) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const bookingIsActiveToday = (booking: any) => {
    const checkIn = normalizeDate(booking.checkIn || booking.search?.checkIn);
    const checkOut = normalizeDate(booking.checkOut || booking.search?.checkOut);
    if (!checkIn || !checkOut) return false;
    const today = normalizeDate(new Date().toISOString().slice(0, 10));
    return checkIn <= today && today <= checkOut;
  };

  const hasActiveStay = bookings.some((b) => (b.status === "Confirmed" || b.status === "CheckedIn") && bookingIsActiveToday(b));

  const handleRequestAssistance = async (requirement: string) => {
    if (!user || !hasActiveStay) return;
    const activeBooking = bookings.find((b) => (b.status === "Confirmed" || b.status === "CheckedIn") && bookingIsActiveToday(b)) || bookings[0];
    const hotelId = activeBooking?.hotel?.id || selectedHotel?.id;

    setRequesting(true);
    try {
      await createNotification({
        role: "manager",
        hotelId: hotelId || undefined,
        userId: user.email,
        message: `Assistance Request: ${requirement}`,
        type: "assistance"
      });
      setRequestSuccess(true);
      setTimeout(() => setRequestSuccess(false), 5000);
    } catch (err: any) {
      throw err;
    } finally {
      setRequesting(false);
    }
  };
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setUser(form as any);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }

    setPasswordLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      setPasswordSaved(true);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSaved(false), 5000);
    } catch (err: any) {
      setPasswordError(err.message || "Unable to update password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="container py-20 max-w-xl text-center flex flex-col items-center">
          <div className="grid place-items-center w-24 h-24 rounded-full bg-accent/10 text-accent mb-6"><User className="w-10 h-10" /></div>
          <h1 className="font-display text-3xl font-bold mb-4">Account Profile</h1>
          <p className="text-muted-foreground mb-8">Please log in to view and manage your profile details and booking history.</p>
          <div className="flex items-center gap-4">
            <button onClick={() => openAuth("signin")} className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-accent text-accent-foreground hover:bg-accent/90 transition-base">Sign In</button>
            <button onClick={() => openAuth("signup")} className="px-6 py-2.5 text-sm font-semibold rounded-lg border border-border hover:bg-accent/5 transition-base">Create Account</button>
          </div>
        </div>
        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} defaultMode={authMode} />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-10 max-w-5xl">
        <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-5 mb-10">
          <div className="flex items-center gap-5">
            <div className="grid place-items-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary text-primary-foreground shrink-0">
              <User className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold">{user.name}</h1>
              <p className="text-muted-foreground text-sm mt-1">{user.city}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => hasActiveStay && setAssistanceOpen(true)}
              disabled={requesting || requestSuccess || !hasActiveStay}
              title={!hasActiveStay ? "Assistance is available only during your stay" : undefined}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                requestSuccess 
                  ? "bg-green-500/10 text-green-600 border border-green-500/20" 
                  : "bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20"
              } ${!hasActiveStay ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {requestSuccess ? (
                <><CheckCircle2 className="w-4 h-4" /> Sent!</>
              ) : (
                <><Mail className="w-4 h-4" /> {requesting ? "Sending..." : "Request Assistance"}</>
              )}
            </button>
            <button onClick={() => setUser(null)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-destructive bg-destructive/10 hover:bg-destructive/20 rounded-lg transition-base">
              <LogOut className="w-4 h-4" /> Log Out
            </button>
          </div>
        </div>

        <div className="max-w-3xl">
          <form onSubmit={save} className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-display text-xl font-bold mb-5">Personal Information</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Full Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" /></Field>
              <Field label="Email Address"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" /></Field>
              <Field label="Phone Number"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" /></Field>
              <Field label="City"><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input" /></Field>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-base">
                <Save className="w-4 h-4" /> Save Changes
              </button>
              {saved && <span className="text-accent text-sm font-medium animate-fade-in">Profile updated!</span>}
            </div>
          </form>

          <form onSubmit={handlePasswordChange} className="bg-card border border-border rounded-2xl p-6 mt-6">
            <div className="flex items-center justify-between mb-5 gap-3">
              <div>
                <h2 className="font-display text-xl font-bold">Change Password</h2>
                <p className="text-sm text-muted-foreground mt-1">Update your account password securely.</p>
              </div>
              <Key className="w-6 h-6 text-accent" />
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Current Password"><input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="input" autoComplete="current-password" /></Field>
              <Field label="New Password"><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input" autoComplete="new-password" /></Field>
              <Field label="Confirm New Password"><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input" autoComplete="new-password" /></Field>
            </div>
            {passwordError && <p className="text-destructive text-sm mt-4">{passwordError}</p>}
            <div className="flex items-center gap-3 mt-6">
              <button type="submit" disabled={passwordLoading}
                className="bg-accent hover:bg-accent/90 text-accent-foreground px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-base">
                <Save className="w-4 h-4" /> {passwordLoading ? "Updating..." : "Change Password"}
              </button>
              {passwordSaved && <span className="text-accent text-sm font-medium animate-fade-in">Password updated!</span>}
            </div>
          </form>
        </div>
      </div>
      <style>{`.input{width:100%;padding:.6rem 1rem;border:1px solid hsl(var(--border));border-radius:.5rem;outline:none;font-size:.875rem;background:transparent;color:hsl(var(--primary))}.input:focus{border-color:hsl(var(--accent))}`}</style>
      <AssistanceModal
        isOpen={assistanceOpen}
        onClose={() => setAssistanceOpen(false)}
        onSubmit={handleRequestAssistance}
        requesting={requesting}
      />
    </Layout>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block"><span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</span><div className="mt-1.5">{children}</div></label>
);

export default Profile;
