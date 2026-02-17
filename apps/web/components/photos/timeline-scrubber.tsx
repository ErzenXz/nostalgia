"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

interface TimelineEntry {
  label: string;
  dateKey: string;
  count: number;
}

interface TimelineScrubberProps {
  entries: TimelineEntry[];
  activeDateKey?: string;
  onSelect: (dateKey: string) => void;
}

export function TimelineScrubber({
  entries,
  activeDateKey,
  onSelect,
}: TimelineScrubberProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const yearGroups = useMemo(() => {
    const groups = new Map<string, TimelineEntry[]>();
    for (const entry of entries) {
      const year = entry.dateKey.slice(0, 4);
      const existing = groups.get(year) ?? [];
      existing.push(entry);
      groups.set(year, existing);
    }
    return groups;
  }, [entries]);

  const maxCount = useMemo(
    () => Math.max(...entries.map((e) => e.count), 1),
    [entries],
  );

  if (entries.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="fixed right-2 top-1/2 -translate-y-1/2 z-30 hidden lg:flex flex-col items-end gap-0.5 py-2"
    >
      {Array.from(yearGroups.entries()).map(([year, yearEntries]) => {
        const isActiveYear = activeDateKey?.startsWith(year);
        const totalCount = yearEntries.reduce((s, e) => s + e.count, 0);
        const barWidth = Math.max(4, (totalCount / maxCount) * 20);

        return (
          <button
            key={year}
            type="button"
            className={cn(
              "group flex items-center gap-1.5 py-0.5 transition-all duration-200 cursor-pointer",
            )}
            onClick={() => {
              const first = yearEntries[0];
              if (first) onSelect(first.dateKey);
            }}
            onMouseEnter={() => {
              const idx = entries.findIndex((e) => e.dateKey.startsWith(year));
              setHoveredIdx(idx);
            }}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {/* Year label */}
            <span
              className={cn(
                "text-[10px] font-medium tabular-nums transition-all duration-200",
                isActiveYear
                  ? "text-primary"
                  : "text-muted-foreground/40 group-hover:text-muted-foreground",
              )}
            >
              {year}
            </span>
            {/* Density bar */}
            <div
              className={cn(
                "h-1 rounded-full transition-all duration-200",
                isActiveYear
                  ? "bg-primary"
                  : "bg-muted-foreground/20 group-hover:bg-muted-foreground/40",
              )}
              style={{ width: `${barWidth}px` }}
            />
          </button>
        );
      })}
    </div>
  );
}
