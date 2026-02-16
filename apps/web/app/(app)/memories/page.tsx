"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { PageHeader } from "@/components/layout/page-header";
import { cn, formatDate } from "@/lib/utils";
import { Sparkles, ChevronRight, Calendar, Loader2 } from "lucide-react";

const typeColors: Record<string, string> = {
  on_this_day: "from-amber-500/20 to-orange-500/20",
  trip: "from-blue-500/20 to-cyan-500/20",
  people: "from-pink-500/20 to-rose-500/20",
  theme: "from-purple-500/20 to-violet-500/20",
  year_review: "from-emerald-500/20 to-green-500/20",
};

const typeLabels: Record<string, string> = {
  on_this_day: "On This Day",
  trip: "Trip",
  people: "People",
  theme: "Theme",
  year_review: "Year in Review",
};

export default function MemoriesPage() {
  const { userId, isLoading: userLoading } = useCurrentUser();

  const memories = useQuery(
    api.memories.listByUser,
    userId ? { userId } : "skip",
  );

  const markSeen = useMutation(api.memories.markSeen);

  const isLoading = userLoading || (userId && memories === undefined);
  const memoryList = memories ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Memories"
        description="Rediscover your favorite moments"
      />

      <div className="space-y-4 p-8">
        {memoryList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <Sparkles className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">No memories yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Upload more photos and memories will be auto-generated
            </p>
          </div>
        ) : (
          memoryList.map((memory) => (
            <div
              key={memory._id}
              className={cn(
                "group relative overflow-hidden rounded-xl border border-border bg-gradient-to-r p-5 transition-all hover:border-muted-foreground/30 cursor-pointer",
                typeColors[memory.type] || "from-secondary to-muted",
              )}
              onClick={() => {
                if (!memory.isSeen) {
                  markSeen({ memoryId: memory._id as any });
                }
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {typeLabels[memory.type]}
                    </span>
                    {!memory.isSeen && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {memory.title}
                  </h3>
                  {memory.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {memory.description}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{memory.photoIds?.length ?? 0} photos</span>
                    <span className="text-border">|</span>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(memory.date)}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
