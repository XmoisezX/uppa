import React from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface InteractiveHoverButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string;
  variant?: "default" | "solid";
}

const InteractiveHoverButton = React.forwardRef<
  HTMLButtonElement,
  InteractiveHoverButtonProps
>(({ text = "Button", variant = "default", className, children, ...props }, ref) => {
  const displayText = text || (typeof children === "string" ? children : "Button");

  if (variant === "solid") {
    return (
      <button
        ref={ref}
        className={cn(
          "group relative flex items-center justify-center gap-2 w-full min-h-[48px] px-6 py-3 cursor-pointer overflow-hidden rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base shadow-lg shadow-indigo-600/25 transition-all duration-300 active:scale-[0.99] select-none",
          className,
        )}
        {...props}
      >
        {/* Efeito suave de onda/hover no fundo */}
        <span className="absolute inset-0 w-full h-full bg-indigo-500/80 scale-0 rounded-full group-hover:scale-105 transition-transform duration-300 ease-out origin-center pointer-events-none" />

        {/* Texto e seta que deslizam suavemente */}
        <div className="relative z-10 flex items-center justify-center gap-2 transition-transform duration-300 group-hover:-translate-x-1.5">
          <span className="tracking-wide">{displayText}</span>
          <ArrowRight className="h-4 w-4 stroke-[2.5] transform -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300" />
        </div>
      </button>
    );
  }

  return (
    <button
      ref={ref}
      className={cn(
        "group relative flex items-center justify-center gap-2 w-32 min-h-[44px] px-4 py-2 cursor-pointer overflow-hidden rounded-full border border-slate-200 bg-background text-center font-semibold text-slate-800 dark:text-slate-100 hover:border-indigo-600 transition-all duration-300",
        className,
      )}
      {...props}
    >
      <span className="absolute inset-0 w-full h-full bg-indigo-50 dark:bg-indigo-950/40 scale-0 rounded-full group-hover:scale-100 transition-transform duration-300 ease-out origin-center pointer-events-none" />
      <div className="relative z-10 flex items-center justify-center gap-2 transition-transform duration-300 group-hover:-translate-x-1">
        <span>{displayText}</span>
        <ArrowRight className="h-4 w-4 stroke-[2.5] text-indigo-600 transform -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300" />
      </div>
    </button>
  );
});

InteractiveHoverButton.displayName = "InteractiveHoverButton";

export { InteractiveHoverButton };
export type { InteractiveHoverButtonProps };
