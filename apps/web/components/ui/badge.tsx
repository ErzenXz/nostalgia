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
          "bg-blue-500/20 text-blue-400": variant === "default",
          "bg-zinc-800 text-zinc-400": variant === "secondary",
          "border border-zinc-700 text-zinc-300": variant === "outline",
          "bg-red-500/20 text-red-400": variant === "destructive",
        },
        className,
      )}
      {...props}
    />
  );
});
Badge.displayName = "Badge";

export { Badge };
