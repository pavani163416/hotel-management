import Sidebar from "./Sidebar";
import { useAdmin } from "@/context/AdminContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { theme, sidebarOpen, setSidebarOpen } = useAdmin();
  const bgStyle = theme === "light"
    ? { background: "linear-gradient(180deg, #f5f7fa 0%, #c3cfe2 100%)" }
    : { background: "linear-gradient(180deg, #0a1628 0%, #07101e 100%)" };
  return (
    <div className="flex h-screen overflow-hidden" style={bgStyle}>
      <Sidebar />
      
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 ml-0 lg:ml-56 flex flex-col overflow-hidden transition-all duration-300">
        <main className="flex-1 overflow-y-auto scrollbar-thin admin-layout-content">
          {children}
        </main>
      </div>
    </div>
  );
}
