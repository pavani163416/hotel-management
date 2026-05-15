import Sidebar from "./Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "linear-gradient(180deg, #0a1628 0%, #07101e 100%)" }}>
      <Sidebar />
      <div className="flex-1 ml-56 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto scrollbar-thin admin-layout-content">
          {children}
        </main>
      </div>
    </div>
  );
}
