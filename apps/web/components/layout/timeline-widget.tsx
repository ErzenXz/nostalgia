"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";
import Link from "next/link";

interface YearData {
  year: number;
  count: number;
}

export function TimelineWidget() {
  const { userId } = useCurrentUser();

  const photosResult = useQuery(
    api.photos.listByUser,
    userId ? { userId, limit: 200 } : "skip",
  );

  const years: YearData[] = useMemo(() => {
    const photos = photosResult?.photos;
    if (!photos || photos.length === 0) return [];

    const yearMap = new Map<number, number>();
    for (const p of photos) {
      const date = p.takenAt ?? p.uploadedAt;
      const year = new Date(date).getFullYear();
      yearMap.set(year, (yearMap.get(year) ?? 0) + 1);
    }

    return Array.from(yearMap.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => b.year - a.year);
  }, [photosResult]);

  if (years.length === 0) return null;

  const maxCount = Math.max(...years.map((y) => y.count), 1);

  return (
    <div className="border-t border-border p-3">
      <div className="flex items-center gap-2 px-1 mb-2">
        <Calendar className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Timeline
        </span>
      </div>
      <div className="space-y-0.5 max-h-40 overflow-y-auto scrollbar-none">
        {years.map((y) => {
          const barWidth = Math.max(8, (y.count / maxCount) * 100);
          return (
            <Link
              key={y.year}
              href={`/photos?year=${y.year}`}
              className="group flex items-center gap-2 px-1 py-0.5 rounded hover:bg-accent/50 transition-colors"
            >
              <span className="text-[10px] text-muted-foreground tabular-nums w-8">
                {y.year}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/40 group-hover:bg-primary/60 transition-colors"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <span className="text-[9px] text-muted-foreground/50 tabular-nums w-6 text-right">
                {y.count}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
