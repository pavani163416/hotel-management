import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Mail, Shield, Edit2, Save, X, KeyRound } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import Topbar from "@/components/Topbar";
import { useAdmin } from "@/context/AdminContext";

export default function Profile() {
  const navigate = useNavigate();
  const { admin, login, token } = useAdmin();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name:  admin?.name  || "",
    email: admin?.email || "",
    role:  admin?.role  || "Super Admin",
  });
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!form.name.trim() || !form.email.trim()) return;
    login({ name: form.name, email: form.email, role: form.role }, token || "");
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleCancel = () => {
    setForm({ name: admin?.name || "", email: admin?.email || "", role: admin?.role || "Super Admin" });
    setEditing(false);
  };

  const initials = (admin?.name || "A").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <AdminLayout>
      <Topbar title="Profile" />
      <div className="p-6 max-w-2xl">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted hover:text-text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Avatar + name */}
        <div className="bg-white rounded-xl border border-border shadow-card p-6 mb-4">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-primary grid place-items-center shrink-0">
              <span className="text-white text-xl font-bold">{initials}</span>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-text-primary">{admin?.name || "Admin"}</h2>
              <p className="text-sm text-muted">{admin?.email || ""}</p>
              <span className="inline-block mt-1 text-xs font-semibold bg-primary-light text-primary px-2.5 py-0.5 rounded-full">
                {admin?.role || "Super Admin"}
              </span>
            </div>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 text-sm font-medium border border-border rounded-lg px-4 py-2 hover:bg-surface-3 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit Profile
              </button>
            )}
          </div>

          {saved && (
            <div className="mt-4 bg-success-light text-success text-sm font-medium px-4 py-2.5 rounded-lg">
              ✓ Profile updated successfully
            </div>
          )}
        </div>

        {/* Profile details / edit form */}
        <div className="bg-white rounded-xl border border-border shadow-card p-6 mb-4">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Profile Information
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">Full Name</label>
              {editing ? (
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                />
              ) : (
                <div className="flex items-center gap-3 bg-surface-2 rounded-lg px-3 py-2.5">
                  <User className="w-4 h-4 text-muted shrink-0" />
                  <span className="text-sm text-text-primary">{admin?.name || "—"}</span>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">Email Address</label>
              {editing ? (
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                />
              ) : (
                <div className="flex items-center gap-3 bg-surface-2 rounded-lg px-3 py-2.5">
                  <Mail className="w-4 h-4 text-muted shrink-0" />
                  <span className="text-sm text-text-primary">{admin?.email || "—"}</span>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">Role</label>
              <div className="flex items-center gap-3 bg-surface-2 rounded-lg px-3 py-2.5">
                <Shield className="w-4 h-4 text-muted shrink-0" />
                <span className="text-sm text-text-primary">{admin?.role || "Super Admin"}</span>
              </div>
            </div>
          </div>

          {editing && (
            <div className="flex items-center gap-3 mt-5 pt-4 border-t border-border">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 text-sm font-semibold bg-primary text-white rounded-lg px-5 py-2.5 hover:bg-primary-dark transition-colors"
              >
                <Save className="w-4 h-4" /> Save Changes
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 text-sm font-medium border border-border rounded-lg px-5 py-2.5 hover:bg-surface-3 transition-colors"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
          )}
        </div>

        {/* Change password section */}
        <div className="bg-white rounded-xl border border-border shadow-card p-6">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary" /> Change Password
          </h3>
          <div className="space-y-4">
            {[
              { label: "Current Password", key: "current" },
              { label: "New Password",     key: "next" },
              { label: "Confirm Password", key: "confirm" },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">{label}</label>
                <input
                  type="password"
                  value={pwForm[key as keyof typeof pwForm]}
                  onChange={(e) => setPwForm({ ...pwForm, [key]: e.target.value })}
                  placeholder="••••••••"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted mt-4">Password changes are saved locally. Connect to backend auth to persist.</p>
        </div>
      </div>
    </AdminLayout>
  );
}
