import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBooking } from "@/context/BookingContext";
import { Loader2, Smartphone } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";
import api from "@/services/api";

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "signin" | "signup";
};

export function AuthModal({ isOpen, onClose, defaultMode = "signin" }: AuthModalProps) {
  const { setUser } = useBooking();
  const [mode, setMode]         = useState<"signin" | "signup" | "phone">(defaultMode);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [phone, setPhone]       = useState("");
  const [city, setCity]         = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [otpMessage, setOtpMessage] = useState("");

  useEffect(() => { if (isOpen) { setMode(defaultMode); setError(""); } }, [isOpen, defaultMode]);

  const resetForm = () => {
    setEmail(""); setPassword(""); setName(""); setPhone(""); setCity(""); setError("");
    setOtpSent(false); setVerificationCode(""); setOtpMessage("");
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

  const finishAuth = (d: any) => {
    localStorage.setItem("luxe_customer_token", d.token);
    setUser({ name: d.name, email: d.email, phone: d.phone || "", city: d.city || "" });
    onClose(); resetForm();
  };

  const handleSendPhoneOTP = async () => {
    if (!phone?.trim()) {
      setError("Please enter a valid phone number.");
      return;
    }
    setError(""); setLoading(true);
    try {
      await api.post("/auth/phone/send", { phone: phone.trim() });
      setOtpSent(true);
      setOtpMessage("OTP sent. Please check your phone and enter the code below.");
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Unable to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneOTP = async () => {
    if (!phone?.trim() || !verificationCode?.trim()) {
      setError("Phone number and OTP code are required.");
      return;
    }
    setError(""); setLoading(true);
    try {
      const res: any = await api.post("/auth/phone/verify", {
        phone: phone.trim(),
        code: verificationCode.trim(),
      });
      finishAuth(res.data?.data ?? res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const loadGoogleScript = () =>
    new Promise<void>((resolve, reject) => {
      if ((window as any).google?.accounts?.id) return resolve();
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Google sign-in could not be loaded."));
      document.head.appendChild(script);
    });

  const GOOGLE_CLIENT_ID_FALLBACK = "70312411330-jo6eo462a26qo7gcici4nr1csaoa8v0q.apps.googleusercontent.com";
  const handleGoogleLogin = async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID_FALLBACK;
    if (!clientId) {
      setError("Google sign-in is not configured yet.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await loadGoogleScript();
      (window as any).google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: any) => {
          try {
            const res: any = await api.post("/auth/google", { idToken: response.credential });
            finishAuth(res.data?.data ?? res.data);
          } catch (err: any) {
            setError(err.message || "Google sign-in failed.");
          } finally {
            setLoading(false);
          }
        },
      });
      (window as any).google.accounts.id.prompt();
    } catch (err: any) {
      setError(err.message || "Google sign-in failed.");
      setLoading(false);
    }
  };

  const AuthOptions = () => (
    <>
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-background text-muted-foreground">Or continue with</span>
        </div>
      </div>
      <div className="grid gap-3">
        <button type="button" onClick={handleGoogleLogin} disabled={loading}
          className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 py-3 rounded-xl font-semibold flex items-center justify-center gap-3 transition-base">
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
        <button type="button" onClick={() => { setMode("phone"); setError(""); setOtpSent(false); setVerificationCode(""); setOtpMessage(""); }}
          className="w-full bg-card hover:bg-secondary text-primary border border-border py-3 rounded-xl font-semibold flex items-center justify-center gap-3 transition-base">
          <Smartphone className="w-5 h-5" />
          Continue with Phone Number
        </button>
      </div>
    </>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-bold">
            {mode === "signin" ? "Welcome Back" : mode === "phone" ? "Continue with Phone" : "Create an Account"}
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
              <PasswordInput value={password} onChange={e => setPassword((e.target as HTMLInputElement).value)}
                className="w-full px-4 py-2 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="••••••••" autoComplete="current-password" />
            </div>
            {error && <p className="text-destructive text-sm font-medium">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-semibold flex items-center justify-center transition-base mt-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
            </button>
            <AuthOptions />
            <p className="text-center text-sm text-muted-foreground mt-4">
              Don't have an account?{" "}
              <button type="button" onClick={() => { setMode("signup"); resetForm(); }}
                className="text-primary hover:underline font-semibold">Sign Up</button>
            </p>
          </form>
        ) : mode === "signup" ? (
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
              <PasswordInput value={password} onChange={e => setPassword((e.target as HTMLInputElement).value)}
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
            <AuthOptions />
            <p className="text-center text-sm text-muted-foreground mt-4">
              Already have an account?{" "}
              <button type="button" onClick={() => { setMode("signin"); resetForm(); }}
                className="text-primary hover:underline font-semibold">Sign In</button>
            </p>
          </form>
        ) : (
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Phone Number</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg outline-none focus:border-accent"
                placeholder="+1 555 000 0000" autoComplete="tel" />
            </div>
            {otpSent && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">OTP Code</label>
                <input type="text" value={verificationCode} onChange={e => setVerificationCode(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg outline-none focus:border-accent"
                  placeholder="Enter OTP" autoComplete="one-time-code" />
              </div>
            )}
            {otpMessage && <p className="text-sm text-foreground">{otpMessage}</p>}
            {error && <p className="text-destructive text-sm font-medium">{error}</p>}
            <button type="button" onClick={otpSent ? handleVerifyPhoneOTP : handleSendPhoneOTP}
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-semibold transition-base">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : otpSent ? "Verify OTP" : "Send OTP"}
            </button>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Prefer email?{" "}
              <button type="button" onClick={() => { setMode("signin"); resetForm(); }}
                className="text-primary hover:underline font-semibold">Sign In</button>
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
