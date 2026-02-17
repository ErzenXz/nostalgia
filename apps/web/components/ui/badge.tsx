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
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
        {
          "bg-primary/20 text-primary": variant === "default",
          "bg-secondary text-secondary-foreground": variant === "secondary",
          "border border-border text-foreground/80": variant === "outline",
          "bg-red-900/30 text-red-400": variant === "destructive",
        },
        className,
      )}
      {...props}
    />
  );
});
Badge.displayName = "Badge";

export { Badge };
