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
          "bg-primary text-primary-foreground": variant === "default",
          "bg-secondary text-secondary-foreground": variant === "secondary",
          "border border-border text-foreground": variant === "outline",
          "bg-destructive/10 text-destructive": variant === "destructive",
        },
        className,
      )}
      {...props}
    />
  );
});
Badge.displayName = "Badge";

export { Badge };
