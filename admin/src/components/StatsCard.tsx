import { TrendingUp, TrendingDown } from "lucide-react";

interface Props {
  title: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: React.ReactNode;
  iconBg?: string;
  suffix?: string;
}

export default function StatsCard({ title, value, change, trend, icon, iconBg, suffix }: Props) {
  // Default icon bg based on trend if not provided
  const defaultIconBg = trend === "up"
    ? "rgba(16,185,129,0.15)"
    : trend === "down"
    ? "rgba(192,57,43,0.15)"
    : "rgba(212,168,67,0.15)";

  const iconBorder = trend === "up"
    ? "rgba(16,185,129,0.25)"
    : trend === "down"
    ? "rgba(192,57,43,0.25)"
    : "rgba(212,168,67,0.25)";

  return (
    <div
      className="rounded-2xl p-5 transition-all"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.04) 100%)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.13)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(0,0,0,0.3)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl grid place-items-center"
          style={{ background: iconBg || defaultIconBg, border: `1px solid ${iconBorder}` }}
        >
          {icon}
        </div>
        {change && (
          <div
            className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
            style={{
              background: trend === "up"
                ? "rgba(16,185,129,0.15)"
                : trend === "down"
                ? "rgba(192,57,43,0.15)"
                : "rgba(100,116,139,0.15)",
              color: trend === "up"
                ? "#10b981"
                : trend === "down"
                ? "#c0392b"
                : "#94a3b8",
              border: trend === "up"
                ? "1px solid rgba(16,185,129,0.25)"
                : trend === "down"
                ? "1px solid rgba(192,57,43,0.25)"
                : "1px solid rgba(100,116,139,0.25)",
            }}
          >
            {trend === "up" && <TrendingUp className="w-3 h-3" />}
            {trend === "down" && <TrendingDown className="w-3 h-3" />}
            {change}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-bright">
        {value}{suffix && <span className="text-sm font-normal text-dim ml-1">{suffix}</span>}
      </p>
      <p className="text-xs text-dim mt-1">{title}</p>
    </div>
  );
}
