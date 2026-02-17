import { cn } from "@/lib/utils";
import { type HTMLAttributes, forwardRef } from "react";

const Badge = forwardRef<
  HTMLSpanElement,
  HTMLAttributes<HTMLSpanElement> & {
    variant?: "default" | "secondary" | "outline" | "destructive";
  }
>(({ className, variant = "default", ...props }, ref) => {
  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-light tracking-wide transition-colors",
        {
          "bg-amber-400/20 text-amber-400/90": variant === "default",
          "bg-white/5 text-white/60": variant === "secondary",
          "border border-white/10 text-white/70": variant === "outline",
          "bg-rose-500/20 text-rose-400/90": variant === "destructive",
        },
        className,
      )}
      {...props}
    />
  );
});
Badge.displayName = "Badge";

export { Badge };
