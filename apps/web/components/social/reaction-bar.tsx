"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const REACTIONS = [
  { type: "heart", emoji: "\u2764\uFE0F", label: "Love" },
  { type: "fire", emoji: "\uD83D\uDD25", label: "Fire" },
  { type: "laugh", emoji: "\uD83D\uDE02", label: "Laugh" },
  { type: "cry", emoji: "\uD83E\uDD72", label: "Touching" },
  { type: "wow", emoji: "\uD83D\uDE2E", label: "Wow" },
] as const;

interface ReactionBarProps {
  counts?: Record<string, number>;
  userReaction?: string | null;
  onReact: (type: string) => void;
  compact?: boolean;
}

export function ReactionBar({
  counts = {},
  userReaction,
  onReact,
  compact = false,
}: ReactionBarProps) {
  const [showPicker, setShowPicker] = useState(false);
  const totalReactions = Object.values(counts).reduce((a, b) => a + b, 0);

  if (compact) {
    return (
      <div className="relative">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
          onClick={() => setShowPicker(!showPicker)}
          onBlur={() => setTimeout(() => setShowPicker(false), 200)}
        >
          {userReaction ? (
            <span className="text-sm">
              {REACTIONS.find((r) => r.type === userReaction)?.emoji}
            </span>
          ) : (
            <span>React</span>
          )}
          {totalReactions > 0 && (
            <span className="text-muted-foreground/60">{totalReactions}</span>
          )}
        </button>

        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 4 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-0 mb-1 flex gap-1 rounded-xl glass px-2 py-1.5 z-50"
            >
              {REACTIONS.map((r) => (
                <button
                  key={r.type}
                  type="button"
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-all hover:scale-125",
                    userReaction === r.type && "bg-primary/20",
                  )}
                  title={r.label}
                  onClick={() => {
                    onReact(r.type);
                    setShowPicker(false);
                  }}
                >
                  {r.emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {REACTIONS.map((r) => {
        const count = counts[r.type] ?? 0;
        const isActive = userReaction === r.type;

        return (
          <button
            key={r.type}
            type="button"
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-all",
              isActive
                ? "bg-primary/15 text-foreground border border-primary/30"
                : "bg-secondary/40 text-muted-foreground hover:bg-secondary/70 border border-transparent",
              count === 0 && !isActive && "opacity-60",
            )}
            onClick={() => onReact(r.type)}
          >
            <span className="text-sm">{r.emoji}</span>
            {count > 0 && <span className="tabular-nums">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
