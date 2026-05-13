import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBooking } from "@/context/BookingContext";
import { Loader2 } from "lucide-react";
import api from "@/services/api";

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "signin" | "signup";
};

export function AuthModal({ isOpen, onClose, defaultMode = "signin" }: AuthModalProps) {
  const { setUser } = useBooking();
  const [mode, setMode]         = useState<"signin" | "signup">(defaultMode);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [phone, setPhone]       = useState("");
  const [city, setCity]         = useState("");

  useEffect(() => { if (isOpen) { setMode(defaultMode); setError(""); } }, [isOpen, defaultMode]);

  const resetForm = () => {
    setEmail(""); setPassword(""); setName(""); setPhone(""); setCity(""); setError("");
  };

  const handleOpenChange = (open: boolean) => { if (!open) { onClose(); resetForm(); } };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Please enter email and password."); return; }
    setError(""); setLoading(true);
    try {
      const res: any = await api.post("/auth/login", { email, password });
      const d = res.data?.data ?? res.data;
      localStorage.setItem("luxe_customer_token", d.token);
      setUser({ name: d.name, email: d.email, phone: d.phone || "", city: d.city || "" });
      onClose(); resetForm();
    } catch (err: any) {
      setError(err.message || "Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !phone) { setError("Please fill all required fields."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setError(""); setLoading(true);
    try {
      const res: any = await api.post("/auth/register", { name, email, password, phone, city });
      const d = res.data?.data ?? res.data;
      localStorage.setItem("luxe_customer_token", d.token);
      setUser({ name: d.name, email: d.email, phone: d.phone || "", city: d.city || "" });
      onClose(); resetForm();
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-bold">
            {mode === "signin" ? "Welcome Back" : "Create an Account"}
          </DialogTitle>
        </DialogHeader>

        {mode === "signin" ? (
          <form onSubmit={handleSignIn} className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="name@example.com" autoComplete="email" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="••••••••" autoComplete="current-password" />
            </div>
            {error && <p className="text-destructive text-sm font-medium">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-semibold flex items-center justify-center transition-base mt-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
            </button>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Don't have an account?{" "}
              <button type="button" onClick={() => { setMode("signup"); resetForm(); }}
                className="text-primary hover:underline font-semibold">Sign Up</button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Full Name <span className="text-destructive">*</span></label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg outline-none focus:border-accent"
                placeholder="John Doe" autoComplete="name" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Email Address <span className="text-destructive">*</span></label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg outline-none focus:border-accent"
                placeholder="name@example.com" autoComplete="email" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Password <span className="text-destructive">*</span></label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg outline-none focus:border-accent"
                placeholder="Min. 6 characters" autoComplete="new-password" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Phone <span className="text-destructive">*</span></label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg outline-none focus:border-accent"
                  placeholder="+1 555 000 0000" autoComplete="tel" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">City</label>
                <input type="text" value={city} onChange={e => setCity(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg outline-none focus:border-accent"
                  placeholder="New York" autoComplete="address-level2" />
              </div>
            </div>
            {error && <p className="text-destructive text-sm font-medium">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-semibold flex items-center justify-center transition-base mt-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
            </button>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Already have an account?{" "}
              <button type="button" onClick={() => { setMode("signin"); resetForm(); }}
                className="text-primary hover:underline font-semibold">Sign In</button>
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
