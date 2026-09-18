import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success";
}

function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variantStyles = {
    default:
      "border-transparent bg-indigo-600 text-white hover:bg-indigo-700",
    secondary:
      "border-transparent bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200",
    destructive:
      "border-transparent bg-red-500 text-white hover:bg-red-600",
    outline: "text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700",
    success:
      "border-transparent bg-emerald-600 text-white hover:bg-emerald-700",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
