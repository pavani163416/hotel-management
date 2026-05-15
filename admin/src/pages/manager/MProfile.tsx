import { useState } from "react";
import { User, Mail, Building2, Shield, LogOut, Check } from "lucide-react";
import ManagerLayout from "@/components/ManagerLayout";
import { useAdmin } from "@/context/AdminContext";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const { admin: manager, logout } = useAdmin();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <ManagerLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-bright">My Profile</h1>
          <p className="text-sm text-dim mt-0.5">Manage your account information</p>
        </div>

        {/* Avatar card */}
        <div className="glass-card rounded-2xl p-6 mb-4 flex items-center gap-5 hover:shadow-2xl transition-all">
          <div className="w-16 h-16 rounded-2xl bg-primary grid place-items-center">
            <span className="text-accent text-2xl font-bold">
              {manager?.name?.charAt(0) || "M"}
            </span>
          </div>
          <div>
            <p className="font-bold text-bright text-lg">{manager?.name || "Manager"}</p>
            <p className="text-sm text-dim">{manager?.email}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gold/10 text-gold border border-gold/20">
                <Shield className="w-3 h-3" /> {manager?.role || "Manager"}
              </span>
              {manager?.hotelName && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5 text-dim border border-white/10">
                  <Building2 className="w-3 h-3" /> {manager.hotelName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Edit form */}
        <div className="glass-card rounded-2xl p-6 mb-4">
          <h2 className="font-semibold text-bright mb-4">Account Details</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-dim uppercase tracking-wider mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
                <input
                  defaultValue={manager?.name || ""}
                  className="w-full pl-10 pr-4 py-2.5 border border-white/10 rounded-xl text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/10 bg-white/5 text-bright"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-dim uppercase tracking-wider mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
                <input
                  type="email"
                  defaultValue={manager?.email || ""}
                  className="w-full pl-10 pr-4 py-2.5 border border-white/10 rounded-xl text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/10 bg-white/5 text-bright"
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
            <button
              type="submit"
              className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
            >
              {saved ? <><Check className="w-4 h-4" /> Saved!</> : "Save Changes"}
            </button>
          </form>
        </div>

        {/* Sign out */}
        <div className="glass-card rounded-2xl p-6 border-ruby/20">
          <h2 className="font-semibold text-bright mb-1">Sign Out</h2>
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
