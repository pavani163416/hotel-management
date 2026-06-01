import { useState, useRef } from "react";
import { User, Mail, Building2, Shield, LogOut, Check, Loader2, Camera, KeyRound } from "lucide-react";
import ManagerLayout from "@/components/ManagerLayout";
import { useAdmin } from "@/context/AdminContext";
import { useNavigate } from "react-router-dom";
import { API } from "@/services/api";

export default function MProfile() {
  const { admin: manager, login, logout, token } = useAdmin();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: manager?.name || "",
    email: manager?.email || "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        try {
          const res = await fetch(`${API}/upload/image`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ image: base64, folder: "profiles" }),
          });
          const data = await res.json();
          if (data.success && manager) {
            login({ ...manager, profileImage: data.url }, token || "");
          }
        } catch (err) {
          console.error("Profile picture upload failed:", err);
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (manager) {
      login({ ...manager, name: form.name, email: form.email }, token || "");
    }
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const initials = (manager?.name || "M").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <ManagerLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-bright">My Profile</h1>
          <p className="text-sm text-dim mt-0.5">Manage your account information</p>
        </div>

        {/* Avatar card */}
        <div className="glass-card rounded-2xl p-6 mb-4 hover:shadow-2xl transition-all">
          <div className="flex items-center gap-5">
            {/* Avatar with upload */}
            <div className="relative group">
              <div
                className="w-20 h-20 rounded-2xl overflow-hidden cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {manager?.profileImage ? (
                  <img src={manager.profileImage} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full grid place-items-center"
                    style={{ background: "linear-gradient(135deg, rgba(192,57,43,0.3) 0%, rgba(192,57,43,0.1) 100%)", border: "1px solid rgba(192,57,43,0.3)" }}
                  >
                    <span className="text-white text-2xl font-bold">{initials}</span>
                  </div>
                )}
                <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {uploading ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
                disabled={uploading}
              />
            </div>

            <div className="flex-1">
              <p className="font-bold text-bright text-lg">{manager?.name || "Manager"}</p>
              <p className="text-sm text-dim">{manager?.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gold/10 text-gold border border-gold/20">
                  <Shield className="w-3 h-3" /> {manager?.role || "Manager"}
                </span>
                {(manager as any)?.hotelName && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5 text-dim border border-white/10">
                    <Building2 className="w-3 h-3" /> {(manager as any).hotelName}
                  </span>
                )}
              </div>
            </div>

            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 text-xs font-semibold border border-white/10 text-dim px-3 py-2 rounded-xl hover:bg-white/05 transition-all"
              >
                Edit Profile
              </button>
            )}
          </div>

          <p className="text-[10px] text-dim mt-3 text-center">
            Click on your avatar to upload a new profile photo
          </p>
        </div>

        {saved && (
          <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>
            <Check className="w-4 h-4" /> Profile updated successfully
          </div>
        )}

        {/* Edit form */}
        <div className="glass-card rounded-2xl p-6 mb-4">
          <h2 className="font-semibold text-bright mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-gold" /> Account Details
          </h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-dim uppercase tracking-wider mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  readOnly={!editing}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm outline-none text-bright transition-all ${
                    editing
                      ? "border-gold/30 bg-white/5 focus:border-gold focus:ring-2 focus:ring-gold/10"
                      : "border-white/10 bg-white/5 text-dim cursor-default"
                  }`}
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-dim uppercase tracking-wider mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  readOnly={!editing}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm outline-none text-bright transition-all ${
                    editing
                      ? "border-gold/30 bg-white/5 focus:border-gold focus:ring-2 focus:ring-gold/10"
                      : "border-white/10 bg-white/5 text-dim cursor-default"
                  }`}
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-dim uppercase tracking-wider mb-1.5">Role</label>
              <input
                value={manager?.role || "Manager"}
                readOnly
                className="w-full px-4 py-2.5 border border-white/10 rounded-xl text-sm bg-white/5 text-dim cursor-not-allowed"
              />
            </div>

            {editing && (
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
                >
                  {saved ? <><Check className="w-4 h-4" /> Saved!</> : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => { setForm({ name: manager?.name || "", email: manager?.email || "" }); setEditing(false); }}
                  className="flex items-center gap-2 border border-white/10 text-dim px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-white/05 transition-all"
                >
                  Cancel
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Sign out */}
        <div className="glass-card rounded-2xl p-6" style={{ borderColor: "rgba(225,29,72,0.2)" }}>
          <h2 className="font-semibold text-bright mb-1 flex items-center gap-2">
            <LogOut className="w-4 h-4 text-ruby" /> Sign Out
          </h2>
          <p className="text-sm text-dim mb-4">You'll need to sign in again to access the portal.</p>
          <button
            onClick={() => { logout(); navigate("/login"); }}
            className="flex items-center gap-2 border border-ruby/20 text-ruby px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-ruby/10 transition-all shadow-lg shadow-ruby/5"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    </ManagerLayout>
  );
}
