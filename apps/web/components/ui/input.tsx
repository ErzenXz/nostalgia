import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-light text-white/90 placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-amber-400/50 focus:border-amber-400/30 disabled:cursor-not-allowed disabled:opacity-40 transition-all duration-200",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
