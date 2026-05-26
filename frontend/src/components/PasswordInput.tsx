import React, { InputHTMLAttributes, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type Props = InputHTMLAttributes<HTMLInputElement> & { className?: string };

export default function PasswordInput(props: Props) {
  const { className = "input", ...rest } = props;
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        {...rest}
        type={(rest.type === "text" ? "text" : (show ? "text" : "password")) as any}
        className={className}
      />
      <button
        type="button"
        aria-label={show ? "Hide password" : "Show password"}
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/70 hover:text-foreground transition-colors"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}
