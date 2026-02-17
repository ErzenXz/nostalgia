"use client";

import { useQuery } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAiOptInForUserId } from "@/hooks/use-ai-opt-in";
import { cn } from "@/lib/utils";
import { Sparkles, Loader2 } from "lucide-react";

interface AiIndexingProgressProps {
  collapsed?: boolean;
  className?: string;
}

/** Shows AI indexing progress (X of Y indexed, Z% — N left). Only visible when opted in and there is pending work. */
export function AiIndexingProgress({
  collapsed = false,
  className,
}: AiIndexingProgressProps) {
  const { userId } = useCurrentUser();
  const { aiOptIn, isLoading: aiOptInLoading } = useAiOptInForUserId(userId as any);
  const progress = useQuery(
    api.users.getAiProgress,
    userId && aiOptIn === true ? { userId } : "skip",
  );

  if (aiOptInLoading || aiOptIn !== true || !progress) return null;
  if (progress.total === 0 && progress.pending === 0) return null;
  if (progress.isComplete && progress.pending === 0) return null;

  const { total, processed, pending, percent } = progress;
  const left = pending;

  if (collapsed) {
    return (
      <div
        className={cn(
          "border-t border-border p-3 flex flex-col items-center gap-1",
          className,
        )}
        title={`${processed} of ${total} indexed (${percent}%) — ${left} left`}
      >
        <div className="relative h-8 w-8">
          <svg className="h-8 w-8 -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-secondary"
            />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${(percent / 100) * 94.2} 94.2`}
              className="text-amber-500 transition-all duration-500"
            />
          </svg>
          <Loader2 className="absolute inset-0 m-auto h-3 w-3 text-amber-500 animate-spin" />
        </div>
        <span className="text-[10px] text-muted-foreground">{percent}%</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-t border-border p-4",
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-xs text-muted-foreground">AI indexing</span>
      </div>
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-amber-500 transition-all duration-500"
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        <span className="text-foreground font-medium">{processed}</span>
        <span className="text-muted-foreground/80"> of {total} indexed </span>
        <span className="text-foreground">({percent}%)</span>
      </p>
      {left > 0 && (
        <p className="text-[11px] text-muted-foreground mt-0.5">
          <Loader2 className="inline h-3 w-3 animate-spin mr-0.5 align-middle" />
          {left} left in queue
        </p>
      )}
    </div>
  );
}
