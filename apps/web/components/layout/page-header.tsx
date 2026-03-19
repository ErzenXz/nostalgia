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
        "sticky top-0 z-30 flex flex-col gap-4 border-b border-border bg-background/95 px-4 py-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between md:px-8",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="truncate text-[22px] font-serif font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-1 truncate text-[13px] font-medium text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {children}
        </div>
      )}
    </div>
  );
}
