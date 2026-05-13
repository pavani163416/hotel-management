import { Check } from "lucide-react";

const steps = ["Selection", "Guest Details", "Review", "Payment"];

const Stepper = ({ current }: { current: number }) => (
  <div className="flex items-center justify-center gap-2 sm:gap-4 py-6">
    {steps.map((s, i) => {
      const done = i < current;
      const active = i === current;
      return (
        <div key={s} className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full grid place-items-center text-xs font-semibold transition-base ${
              done ? "bg-accent text-accent-foreground" : active ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
            }`}>
              {done ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`hidden sm:inline text-sm font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>{s}</span>
          </div>
          {i < steps.length - 1 && <div className={`w-8 sm:w-16 h-px ${done ? "bg-accent" : "bg-border"}`} />}
        </div>
      );
    })}
  </div>
);

export default Stepper;
