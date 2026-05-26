import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBooking } from "@/context/BookingContext";
import { Loader2, Smartphone } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";
import api from "@/services/api";
import { ContactAdminModal } from "./auth/ContactAdminModal";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";

const GOOGLE_CLIENT_ID_FALLBACK = "70312411330-jo6eo462a26qo7gcici4nr1csaoa8v0q.apps.googleusercontent.com";

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "signin" | "signup";
};

function AuthModalInner({ isOpen, onClose, defaultMode, mode, setMode, loading, setLoading, error, setError, email, setEmail, password, setPassword, name, setName, phone, setPhone, city, setCity, otpSent, setOtpSent, verificationCode, setVerificationCode, otpMessage, setOtpMessage, resendCooldown, setResendCooldown, showContactAdmin, setShowContactAdmin, resetForm, handleOpenChange, handleSignIn, handleSignUp, finishAuth, handleSendPhoneOTP, handleVerifyPhoneOTP, handleVerifyEmailOTP, handleResendEmailOTP, renderAuthOptions }: any) {
  // We extract the Google Login hook into a child component wrapped in GoogleOAuthProvider
  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setError("");
      setLoading(true);
      try {
        // The backend expects `idToken` but supports receiving Google's access token directly.
        const res: any = await api.post("/auth/google", { idToken: tokenResponse.access_token });
        finishAuth(res.data?.data ?? res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || "Google sign-in failed.");
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setError("Google sign-in was unsuccessful.");
    }
  });

  const authOptions = (
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
        <button type="button" onClick={() => login()} disabled={loading}
          className="w-full bg-card hover:bg-secondary text-primary border border-border py-3 rounded-xl font-semibold flex items-center justify-center gap-3 transition-base">
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
    <DialogContent className="sm:max-w-[425px]" aria-describedby={undefined}>
      <DialogHeader>
        <DialogTitle className="font-display text-2xl font-bold">
          {mode === "signin" ? "Welcome Back" : mode === "phone" ? "Continue with Phone" : mode === "verify_email_otp" ? "Verify Your Email" : "Create an Account"}
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
          {authOptions}
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
          {authOptions}
          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{" "}
            <button type="button" onClick={() => { localStorage.removeItem("luxe_pending_email"); setMode("signin"); resetForm(); }}
              className="text-primary hover:underline font-semibold">Sign In</button>
          </p>
        </form>
      ) : mode === "phone" ? (
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
            <button type="button" onClick={() => { localStorage.removeItem("luxe_pending_email"); setMode("signin"); resetForm(); }}
              className="text-primary hover:underline font-semibold">Sign In</button>
          </p>
        </div>
      ) : (
        <form onSubmit={handleVerifyEmailOTP} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-center">Verification Code</label>
            <input
              type="text"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
              className="w-full px-4 py-3 border border-border rounded-lg outline-none text-center text-2xl tracking-[0.5em] font-semibold focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="000000"
              autoComplete="one-time-code"
              required
            />
          </div>
          {otpMessage && (
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg text-center leading-relaxed">
              {otpMessage}
            </p>
          )}
          {error && <p className="text-destructive text-sm font-medium text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-semibold flex items-center justify-center transition-base mt-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Code"}
          </button>
          <div className="flex flex-col gap-2 items-center mt-4">
            <button
              type="button"
              onClick={handleResendEmailOTP}
              disabled={loading || resendCooldown > 0}
              className="text-primary hover:underline text-sm font-semibold disabled:text-muted-foreground disabled:no-underline"
            >
              {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : "Resend Verification Code"}
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("luxe_pending_email");
                setMode("signin");
                resetForm();
              }}
              className="text-muted-foreground hover:text-foreground text-xs mt-2"
            >
              Back to Sign In
            </button>
          </div>
        </form>
      )}
      <div className="mt-4 pt-4 border-t border-border flex justify-center">
        <button 
          type="button"
          onClick={() => setShowContactAdmin(true)}
          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          Contact System Admin
        </button>
      </div>
    </DialogContent>
  );
}

export function AuthModal({ isOpen, onClose, defaultMode = "signin" }: AuthModalProps) {
  const { setUser } = useBooking();
  const [mode, setMode]         = useState<"signin" | "signup" | "phone" | "verify_email_otp">(defaultMode);
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
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showContactAdmin, setShowContactAdmin] = useState(false);

  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCooldown]);

  useEffect(() => {
    if (isOpen) {
      const pendingEmail = localStorage.getItem("luxe_pending_email");
      if (pendingEmail) {
        setMode("verify_email_otp");
        setEmail(pendingEmail);
        setOtpMessage("Your account is pending verification. Please verify your email to continue.");
      } else {
        setMode(defaultMode);
      }
      setError("");
    }
  }, [isOpen, defaultMode]);

  const resetForm = () => {
    setEmail(""); setPassword(""); setName(""); setPhone(""); setCity(""); setError("");
    setOtpSent(false); setVerificationCode(""); setOtpMessage(""); setResendCooldown(0);
    // Don't clear localStorage pending email here, let explicit actions do it
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
      const respData = err.response?.data;
      if (respData?.requiresVerification || respData?.code === "UNVERIFIED_EMAIL" || err.code === "UNVERIFIED_EMAIL") {
        const pendingEmail = respData?.email || email;
        localStorage.setItem("luxe_pending_email", pendingEmail);
        setEmail(pendingEmail);
        setMode("verify_email_otp");
        
        if (respData?.otp) {
          setVerificationCode(respData.otp);
          const showOtpDev = import.meta.env.VITE_SHOW_OTP_DEV === "true";
          setOtpMessage(
            showOtpDev
              ? `DEV MODE: Your verification code is ${respData.otp}`
              : "A verification code has been sent to your email."
          );
        } else {
          setOtpMessage(respData?.message || "Your account is pending verification. A verification code has been sent to your email.");
        }
        setError("");
        setResendCooldown(60); // Trigger cooldown on auto-resend
      } else {
        setError(respData?.message || err.message || "Sign in failed. Please try again.");
      }
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
      if (d.isVerified === false) {
        localStorage.setItem("luxe_pending_email", d.email || email);
        setEmail(d.email || email);
        setMode("verify_email_otp");
        if (res.data?.otp) {
          setVerificationCode(res.data.otp);
          const showOtpDev = import.meta.env.VITE_SHOW_OTP_DEV === "true";
          setOtpMessage(
            showOtpDev
              ? `DEV MODE: Your verification code is ${res.data.otp}`
              : "A verification code has been sent to your email."
          );
        } else {
          setOtpMessage(res.data?.message || "Registration successful! A verification code has been sent to your email.");
        }
        setResendCooldown(60);
      } else {
        localStorage.setItem("luxe_customer_token", d.token);
        setUser({ name: d.name, email: d.email, phone: d.phone || "", city: d.city || "" });
        onClose(); resetForm();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const finishAuth = (d: any) => {
    localStorage.removeItem("luxe_pending_email");
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

  const handleVerifyEmailOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode?.trim()) {
      setError("Please enter the verification code.");
      return;
    }
    setError(""); setLoading(true);
    try {
      const res: any = await api.post("/auth/verify-otp", {
        email: email.trim(),
        code: verificationCode.trim(),
      });
      finishAuth(res.data?.data ?? res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmailOTP = async () => {
    setError(""); setLoading(true);
    try {
      const res: any = await api.post("/auth/resend-otp", { email: email.trim() });
      if (res.data?.otp) {
        setVerificationCode(res.data.otp);
        setOtpMessage(`DEV MODE: Your new verification code is ${res.data.otp}`);
      } else {
        setOtpMessage("A new verification code has been sent to your email.");
      }
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || "Resend failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID_FALLBACK;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <GoogleOAuthProvider clientId={clientId}>
        <AuthModalInner 
          isOpen={isOpen} onClose={onClose} defaultMode={defaultMode} 
          mode={mode} setMode={setMode} loading={loading} setLoading={setLoading}
          error={error} setError={setError} email={email} setEmail={setEmail}
          password={password} setPassword={setPassword} name={name} setName={setName}
          phone={phone} setPhone={setPhone} city={city} setCity={setCity}
          otpSent={otpSent} setOtpSent={setOtpSent} verificationCode={verificationCode} setVerificationCode={setVerificationCode}
          otpMessage={otpMessage} setOtpMessage={setOtpMessage} resendCooldown={resendCooldown} setResendCooldown={setResendCooldown}
          showContactAdmin={showContactAdmin} setShowContactAdmin={setShowContactAdmin} resetForm={resetForm}
          handleOpenChange={handleOpenChange} handleSignIn={handleSignIn} handleSignUp={handleSignUp}
          finishAuth={finishAuth} handleSendPhoneOTP={handleSendPhoneOTP} handleVerifyPhoneOTP={handleVerifyPhoneOTP}
          handleVerifyEmailOTP={handleVerifyEmailOTP} handleResendEmailOTP={handleResendEmailOTP}
        />
      </GoogleOAuthProvider>
      <ContactAdminModal 
        isOpen={showContactAdmin} 
        onClose={() => setShowContactAdmin(false)}
        defaultEmail={email}
      />
    </Dialog>
  );
}
