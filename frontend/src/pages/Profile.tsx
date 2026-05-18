import { useState, useEffect } from "react";
import { User, Save, LogOut, Mail, CheckCircle2 } from "lucide-react";
import Layout from "@/components/Layout";
import { useBooking } from "@/context/BookingContext";
import { AuthModal } from "@/components/AuthModal";
import { createNotification } from "@/services/api";
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

  useEffect(() => { if (user) setForm(user); }, [user]);

  const openAuth = (mode: "signin" | "signup") => { setAuthMode(mode); setAuthOpen(true); };

  const handleRequestAssistance = async (requirement: string) => {
    if (!user) return;
    const activeBooking = bookings.find((b) => b.status === "Confirmed") || bookings[0];
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
              onClick={() => setAssistanceOpen(true)}
              disabled={requesting || requestSuccess}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                requestSuccess 
                  ? "bg-green-500/10 text-green-600 border border-green-500/20" 
                  : "bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20"
              }`}
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
