import { useEffect } from "react";
import { X } from "lucide-react";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
  side?: "right" | "left";
}

export default function Drawer({
  isOpen, onClose, title, children, width = "w-[480px]", side = "right",
}: DrawerProps) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{ background: "rgba(7,16,30,0.7)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
        onClick={onClose}
      />
      <div
        className={`fixed top-0 ${side === "right" ? "right-0" : "left-0"} h-full z-50 flex flex-col
          transition-transform duration-300 ease-out ${width}
          ${isOpen ? "translate-x-0" : side === "right" ? "translate-x-full" : "-translate-x-full"}`}
        style={{
          background: "linear-gradient(180deg, #112240 0%, #0d1e35 100%)",
          borderLeft: side === "right" ? "1px solid rgba(255,255,255,0.09)" : "none",
          borderRight: side === "left" ? "1px solid rgba(255,255,255,0.09)" : "none",
          boxShadow: side === "right" ? "-24px 0 80px rgba(0,0,0,0.5)" : "24px 0 80px rgba(0,0,0,0.5)",
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <h2 className="font-bold text-bright text-base">{title}</h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-dim transition-all"
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.color = "#f0f4ff"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#64748b"; }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5">
          {children}
        </div>
      </div>
    </>
  );
}
