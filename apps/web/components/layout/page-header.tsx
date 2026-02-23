import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-6 md:px-8 py-5",
        "border-b border-amber-900/20",
        "bg-gradient-to-r from-[#0f0e0d] via-background to-[#0f0e0d]",
        className,
      )}
    >
      <div>
        <h1 className="text-xl font-heading font-semibold text-foreground/95 tracking-tight">{title}</h1>
        {description && (
          <p className="mt-0.5 text-[11px] font-mono text-amber-800/50 tracking-wider uppercase">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
