"use client";

import { useQuery } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import { cn } from "@/lib/utils";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
} from "lucide-react";

interface AiProcessingStatusProps {
  photoId: string;
  compact?: boolean;
}

const statusConfig = {
  pending: {
    icon: Clock,
    label: "AI Pending",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  processing: {
    icon: Loader2,
    label: "AI Processing",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    spin: true,
  },
  completed: {
    icon: CheckCircle2,
    label: "AI Complete",
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  failed: {
    icon: AlertCircle,
    label: "AI Failed",
    color: "text-destructive",
    bg: "bg-destructive/10",
  },
} as const;

const stepLabels: Record<string, string> = {
  pending: "Waiting",
  embedding: "Generating embeddings",
  caption: "Writing caption",
  tags: "Tagging",
  done: "Done",
};

export function AiProcessingStatus({
  photoId,
  compact = false,
}: AiProcessingStatusProps) {
  const job = useQuery(api.processing.getByPhotoId, {
    photoId: photoId as any,
  });

  if (!job) return null;

  const config = statusConfig[job.status as keyof typeof statusConfig];
  if (!config) return null;

  const Icon = config.icon;
  const step: string = job.step ?? "pending";
  const stepLabel = stepLabels[step] ?? step;

  if (compact) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5",
          config.bg,
        )}
      >
        <Icon
          className={cn(
            "h-3 w-3",
            config.color,
            "spin" in config && config.spin ? "animate-spin" : "",
          )}
        />
        <span className={cn("text-[10px] font-medium", config.color)}>
          {config.label}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border px-3 py-2",
        config.bg,
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          config.color,
          "spin" in config && config.spin ? "animate-spin" : "",
        )}
      />
      <div className="flex-1 min-w-0">
        <p className={cn("text-xs font-medium", config.color)}>
          {config.label}
        </p>
        <p className="text-[11px] text-muted-foreground">{stepLabel}</p>
      </div>
      {job.status === "failed" && job.error && (
        <p className="text-[10px] text-destructive truncate max-w-[150px]">
          {job.error}
        </p>
      )}
      {job.status === "failed" && (
        <button
          className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          title="Retry AI processing"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      )}
    </div>
  );
}
