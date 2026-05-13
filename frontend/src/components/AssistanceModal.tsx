import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Send, AlertCircle, BedDouble, Layers } from "lucide-react";

type AssistanceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { message: string; roomNo: string; floorNo: string }) => Promise<void>;
  requesting: boolean;
  defaultRoomNo?: string;
  defaultFloorNo?: string;
};

export const AssistanceModal = ({
  isOpen,
  onClose,
  onSubmit,
  requesting,
  defaultRoomNo = "",
  defaultFloorNo = "",
}: AssistanceModalProps) => {
  const [message, setMessage] = useState("");
  const [roomNo, setRoomNo]   = useState(defaultRoomNo);
  const [floorNo, setFloorNo] = useState(defaultFloorNo);
  const [error, setError]     = useState("");

  // Sync pre-filled values whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setRoomNo(defaultRoomNo);
      setFloorNo(defaultFloorNo);
      setMessage("");
      setError("");
    }
  }, [isOpen, defaultRoomNo, defaultFloorNo]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError("Please describe your requirement.");
      return;
    }
    setError("");
    try {
      await onSubmit({ message, roomNo, floorNo });
      setMessage("");
      setRoomNo("");
      setFloorNo("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to send request.");
    }
  };

  const modal = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        backgroundColor: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "28rem",
          backgroundColor: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "1rem",
          boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: "1rem 1.5rem",
          borderBottom: "1px solid hsl(var(--border))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <h3 style={{ fontWeight: 700, fontSize: "1.125rem", margin: 0 }}>Request Assistance</h3>
          <button
            onClick={onClose}
            style={{ padding: "0.25rem", borderRadius: "9999px", background: "transparent", border: "none", cursor: "pointer", display: "flex" }}
          >
            <X style={{ width: "1.25rem", height: "1.25rem", color: "hsl(var(--muted-foreground))" }} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--muted-foreground))", margin: 0 }}>
            Tell the manager how we can help you. We'll get back to you as soon as possible.
          </p>

          {/* Room + Floor */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "hsl(var(--muted-foreground))", marginBottom: "0.375rem" }}>
                <BedDouble style={{ width: "0.875rem", height: "0.875rem" }} /> Room No
              </label>
              <input
                type="text"
                value={roomNo}
                onChange={(e) => setRoomNo(e.target.value)}
                placeholder="e.g. 102"
                style={{ width: "100%", background: "transparent", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", padding: "0.625rem 0.75rem", fontSize: "0.875rem", outline: "none", color: "hsl(var(--foreground))", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "hsl(var(--muted-foreground))", marginBottom: "0.375rem" }}>
                <Layers style={{ width: "0.875rem", height: "0.875rem" }} /> Floor No
              </label>
              <input
                type="text"
                value={floorNo}
                onChange={(e) => setFloorNo(e.target.value)}
                placeholder="e.g. 3"
                style={{ width: "100%", background: "transparent", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", padding: "0.625rem 0.75rem", fontSize: "0.875rem", outline: "none", color: "hsl(var(--foreground))", boxSizing: "border-box" }}
              />
            </div>
          </div>

          {/* Message */}
          <div>
            <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "hsl(var(--muted-foreground))", marginBottom: "0.375rem" }}>
              Requirement <span style={{ color: "hsl(var(--destructive))" }}>*</span>
            </label>
            <textarea
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. I need extra towels in my room, or I have a question about my booking..."
              rows={3}
              style={{ width: "100%", background: "transparent", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", padding: "0.75rem 1rem", fontSize: "0.875rem", outline: "none", resize: "none", color: "hsl(var(--foreground))", boxSizing: "border-box", fontFamily: "inherit" }}
            />
          </div>

          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "hsl(var(--destructive))", fontSize: "0.75rem", fontWeight: 500 }}>
              <AlertCircle style={{ width: "1rem", height: "1rem" }} /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={requesting}
            style={{
              width: "100%",
              background: "hsl(var(--accent))",
              color: "hsl(var(--accent-foreground))",
              padding: "0.75rem",
              borderRadius: "0.75rem",
              fontWeight: 600,
              fontSize: "0.875rem",
              border: "none",
              cursor: requesting ? "not-allowed" : "pointer",
              opacity: requesting ? 0.5 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            {requesting ? (
              <div style={{ width: "1rem", height: "1rem", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "9999px", animation: "spin 0.6s linear infinite" }} />
            ) : (
              <><Send style={{ width: "1rem", height: "1rem" }} /> Send Request</>
            )}
          </button>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};
