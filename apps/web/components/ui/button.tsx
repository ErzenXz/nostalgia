import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-light tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-amber-400/90 to-amber-500/80 text-black/80 hover:from-amber-400 hover:to-amber-500/90 shadow-lg shadow-amber-400/10",
        destructive:
          "bg-rose-500/20 text-rose-400/80 ring-1 ring-inset ring-rose-400/30 hover:bg-rose-500/30 hover:text-rose-400",
        outline:
          "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white/90 hover:border-white/20",
        secondary:
          "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white/90",
        ghost: "text-white/50 hover:bg-white/5 hover:text-white/80",
        link: "text-amber-400/80 underline-offset-4 hover:text-amber-400 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-6 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
