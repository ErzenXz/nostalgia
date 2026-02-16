import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
}

export function Progress({ value, max = 100, className }: ProgressProps) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-secondary",
        className,
      )}
    >
      <div
        className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
