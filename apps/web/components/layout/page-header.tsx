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
        "border-b border-white/[0.06]",
        className,
      )}
    >
      <div>
        <h1 className="text-xl font-semibold text-[#f1f1f1]">{title}</h1>
        {description && (
          <p className="mt-0.5 text-[12px] text-[#aaa]">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
