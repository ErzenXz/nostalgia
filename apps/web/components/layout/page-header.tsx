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
        "flex items-center justify-between border-b border-white/5 px-8 py-5",
        className,
      )}
    >
      <div>
        <h1 className="text-xl font-light tracking-wide text-white/90">{title}</h1>
        {description && (
          <p className="mt-1 text-sm font-light text-white/40">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
