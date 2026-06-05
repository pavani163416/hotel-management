import Sidebar from "./Sidebar";
import { useAdmin } from "@/context/AdminContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { theme } = useAdmin();
  const bgStyle = theme === "light"
    ? { background: "linear-gradient(180deg, #f5f7fa 0%, #c3cfe2 100%)" }
    : { background: "linear-gradient(180deg, #0a1628 0%, #07101e 100%)" };
  return (
    <div className="flex h-screen overflow-hidden" style={bgStyle}>
      <Sidebar />
      <div className="flex-1 ml-56 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto scrollbar-thin admin-layout-content">
          {children}
        </main>
      </div>
    </div>
  );
}
