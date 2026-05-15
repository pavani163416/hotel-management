type Status = "Confirmed" | "Pending" | "Cancelled" | "Completed" | "Active" | "Maintenance" | "Available" | "Booked" | "Inactive" | string;

type BadgeStyle = { bg: string; color: string; border: string };

const map: Record<string, BadgeStyle> = {
  Confirmed:    { bg: "rgba(16,185,129,0.15)",  color: "#10b981", border: "rgba(16,185,129,0.3)"  },
  Active:       { bg: "rgba(16,185,129,0.15)",  color: "#10b981", border: "rgba(16,185,129,0.3)"  },
  Available:    { bg: "rgba(16,185,129,0.15)",  color: "#10b981", border: "rgba(16,185,129,0.3)"  },
  Approved:     { bg: "rgba(16,185,129,0.15)",  color: "#10b981", border: "rgba(16,185,129,0.3)"  },
  Pending:      { bg: "rgba(245,158,11,0.15)",  color: "#f59e0b", border: "rgba(245,158,11,0.3)"  },
  Maintenance:  { bg: "rgba(245,158,11,0.15)",  color: "#f59e0b", border: "rgba(245,158,11,0.3)"  },
  Booked:       { bg: "rgba(212,168,67,0.15)",  color: "#d4a843", border: "rgba(212,168,67,0.3)"  },
  Cancelled:    { bg: "rgba(225,29,72,0.15)",   color: "#e11d48", border: "rgba(225,29,72,0.3)"   },
  Inactive:     { bg: "rgba(225,29,72,0.15)",   color: "#e11d48", border: "rgba(225,29,72,0.3)"   },
  Rejected:     { bg: "rgba(225,29,72,0.15)",   color: "#e11d48", border: "rgba(225,29,72,0.3)"   },
  Completed:    { bg: "rgba(100,116,139,0.15)", color: "#94a3b8", border: "rgba(100,116,139,0.3)" },
  Paid:         { bg: "rgba(16,185,129,0.15)",  color: "#10b981", border: "rgba(16,185,129,0.3)"  },
  Refunded:     { bg: "rgba(59,130,246,0.15)",  color: "#3b82f6", border: "rgba(59,130,246,0.3)"  },
  Failed:       { bg: "rgba(225,29,72,0.15)",   color: "#e11d48", border: "rgba(225,29,72,0.3)"   },
};

const fallback: BadgeStyle = { bg: "rgba(100,116,139,0.15)", color: "#94a3b8", border: "rgba(100,116,139,0.3)" };

export default function StatusBadge({ status }: { status: Status }) {
  const s = map[status] || fallback;
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {status}
    </span>
  );
}
