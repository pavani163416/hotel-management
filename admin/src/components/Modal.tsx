import { X } from "lucide-react";
import { useEffect } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export default function Modal({ isOpen, onClose, title, children, size = "md" }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (isOpen) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widths = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(7,16,30,0.75)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={`modal-panel relative w-full ${widths[size]} max-h-[90vh] overflow-y-auto rounded-2xl animate-slide-up`}
        style={{
          background: "linear-gradient(135deg, rgba(17,34,64,0.98) 0%, rgba(13,26,48,0.98) 100%)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <h3 className="font-semibold text-bright">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 grid place-items-center rounded-xl transition-all"
            style={{ color: "#64748b" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.color = "#f0f4ff"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#64748b"; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
