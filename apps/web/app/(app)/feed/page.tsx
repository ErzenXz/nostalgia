"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAiOptInForUserId } from "@/hooks/use-ai-opt-in";
import { PageHeader } from "@/components/layout/page-header";
import { usePhotoUrl } from "@/hooks/use-photo-url";
import { useDecryptedBlobUrl } from "@/hooks/use-decrypted-blob-url";
import Image from "next/image";
import { cn, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Clock,
  Calendar,
  Shuffle,
  Telescope,
  Loader2,
  Heart,
  Settings,
  AlertTriangle,
  RefreshCw,
  ImageOff,
} from "lucide-react";
import Link from "next/link";

type FeedMode = "nostalgia" | "on_this_day" | "deep_dive_year" | "serendipity";

interface FeedItem {
  photoId: string;
  takenAt: number | null;
  uploadedAt: number;
  reason: string;
  score: number;
  scoreBreakdown: { nostalgia: number; coherence: number };
  captionShort: string | null;
  aiTagsV2: string[] | null;
}

const modeConfig: Record<
  FeedMode,
  { label: string; icon: typeof Sparkles; description: string; emptyHint: string }
> = {
  nostalgia: {
    label: "Nostalgia",
    icon: Sparkles,
    description: "A story of your life, curated by AI from your most meaningful moments",
    emptyHint: "Upload photos spanning different time periods to unlock nostalgia scoring",
  },
  on_this_day: {
    label: "On This Day",
    icon: Calendar,
    description: "See what you were doing on this day in past years",
    emptyHint: "Photos with dates from previous years will appear here",
  },
  deep_dive_year: {
    label: "Deep Dive",
    icon: Telescope,
    description: "Explore a specific year in detail",
    emptyHint: "Select a year that has photos to explore",
  },
  serendipity: {
    label: "Serendipity",
    icon: Shuffle,
    description: "Rediscover forgotten moments you haven't seen in a while",
    emptyHint: "The more photos you upload, the better the surprises",
  },
};

// ─── Skeleton ──────────────────────────────────────────────

function FeedCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="aspect-[4/3] w-full bg-secondary/60 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent animate-[shimmer_2s_infinite] -translate-x-full" />
      </div>
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-20 rounded-full bg-secondary animate-pulse" />
          <div className="h-3 w-28 rounded-full bg-secondary/60 animate-pulse" />
        </div>
        <div className="h-4 w-3/4 rounded bg-secondary/50 animate-pulse" />
        <div className="flex gap-1.5">
          <div className="h-5 w-14 rounded-md bg-secondary/40 animate-pulse" />
          <div className="h-5 w-10 rounded-md bg-secondary/40 animate-pulse" />
          <div className="h-5 w-16 rounded-md bg-secondary/40 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ─── Feed Photo ────────────────────────────────────────────

function FeedPhoto({
  storageKey,
  thumbnailStorageKey,
  mimeType,
  isEncrypted,
  alt,
}: {
  storageKey: string;
  thumbnailStorageKey?: string;
  mimeType: string;
  isEncrypted?: boolean;
  alt: string;
}) {
  const imageKey = thumbnailStorageKey || storageKey;
  const signedUrl = usePhotoUrl(imageKey);
  const isThumb = !!thumbnailStorageKey && imageKey === thumbnailStorageKey;
  const mimeTypeForKey = isThumb ? "image/jpeg" : mimeType;
  const decryptedUrl = useDecryptedBlobUrl({
    cacheKey: imageKey,
    signedUrl,
    mimeType: mimeTypeForKey,
    enabled: !!isEncrypted,
  });

  const displayUrl = isEncrypted ? decryptedUrl : signedUrl;

  if (!displayUrl) {
    return (
      <div className="aspect-[4/3] w-full bg-secondary/60 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent animate-[shimmer_2s_infinite] -translate-x-full" />
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden">
      <Image
        src={displayUrl}
        alt={alt}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        sizes="(max-width: 768px) 100vw, 600px"
        unoptimized
      />
    </div>
  );
}

// ─── Feed Card ─────────────────────────────────────────────

function FeedCard({
  item,
  photo,
  onFavorite,
}: {
  item: FeedItem;
  photo: any;
  onFavorite: (id: string) => void;
}) {
  if (!photo) return null;

  const date = item.takenAt ?? item.uploadedAt;
  const year = date ? new Date(date).getFullYear() : null;

  return (
    <div className="group relative rounded-2xl border border-border bg-card overflow-hidden transition-all duration-200 hover:border-muted-foreground/25 hover:shadow-lg hover:shadow-black/5">
      {/* Photo */}
      <FeedPhoto
        storageKey={photo.storageKey}
        thumbnailStorageKey={photo.thumbnailStorageKey}
        mimeType={photo.mimeType}
        isEncrypted={photo.isEncrypted}
        alt={item.captionShort || photo.fileName}
      />

      {/* Overlay gradient for reason text on image */}
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />

      {/* Reason — overlaid on the image top-left */}
      <div className="absolute top-3 left-4 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-white/90 uppercase tracking-wider">
          <Sparkles className="h-3 w-3 text-purple-300" />
          {item.reason}
        </span>
      </div>

      {/* Favorite button */}
      <button
        className="absolute top-3 right-3 rounded-full bg-black/30 backdrop-blur-sm p-2 text-white/80 hover:bg-black/50 hover:text-white transition-all opacity-0 group-hover:opacity-100"
        onClick={() => onFavorite(item.photoId)}
      >
        <Heart
          className={cn(
            "h-4 w-4",
            photo.isFavorite ? "fill-red-500 text-red-500" : "",
          )}
        />
      </button>

      {/* Bottom overlay content — caption on image */}
      {item.captionShort && (
        <div className="absolute bottom-0 inset-x-0 px-5 pb-4 pointer-events-none">
          <p className="text-sm text-white/90 font-medium leading-snug drop-shadow-sm line-clamp-2">
            {item.captionShort}
          </p>
        </div>
      )}

      {/* Content below image */}
      <div className="px-5 py-4 space-y-2.5">
        {/* Date */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {date ? formatDate(date) : "Unknown date"}
          </div>
          {year && (
            <span className="text-[10px] font-medium text-muted-foreground/60 tabular-nums">
              {Math.floor(
                (Date.now() - (date ?? Date.now())) / (365.25 * 24 * 60 * 60 * 1000),
              )}{" "}
              years ago
            </span>
          )}
        </div>

        {/* Tags */}
        {item.aiTagsV2 && item.aiTagsV2.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.aiTagsV2.slice(0, 6).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-[10px] px-1.5 py-0 bg-secondary/60"
              >
                {tag}
              </Badge>
            ))}
            {item.aiTagsV2.length > 6 && (
              <span className="self-center text-[10px] text-muted-foreground">
                +{item.aiTagsV2.length - 6}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Feed Card with Photo Hydration ───────────────────────

function FeedCardWithPhoto({
  item,
  onFavorite,
}: {
  item: FeedItem;
  onFavorite: (id: string) => void;
}) {
  const photo = useQuery(api.photos.getById, {
    photoId: item.photoId as any,
  });

  if (photo === undefined) {
    return <FeedCardSkeleton />;
  }

  if (photo === null) {
    return null;
  }

  return <FeedCard item={item} photo={photo} onFavorite={onFavorite} />;
}

// ─── Main Page ─────────────────────────────────────────────

export default function FeedPage() {
  const [mode, setMode] = useState<FeedMode>("nostalgia");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [seed] = useState(() => crypto.randomUUID());
  const [deepDiveYear, setDeepDiveYear] = useState(
    () => new Date().getFullYear() - 1,
  );
  const { userId, isLoading: userLoading } = useCurrentUser();
  const { aiOptIn, isLoading: aiOptInLoading } = useAiOptInForUserId(userId as any);
  const observerRef = useRef<HTMLDivElement>(null);
  const nextCursorRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);

  const getNostalgiaFeed = useAction(api.feed.nostalgia.getNostalgiaFeed);
  const toggleFavorite = useMutation(api.photos.toggleFavorite);

  const mergeUnique = useCallback((prev: FeedItem[], next: FeedItem[]) => {
    const seen = new Set(prev.map((i) => i.photoId));
    const out = [...prev];
    for (const item of next) {
      if (!seen.has(item.photoId)) {
        seen.add(item.photoId);
        out.push(item);
      }
    }
    return out;
  }, []);

  const loadMore = useCallback(
    async (reset = false) => {
      if (userLoading || aiOptInLoading || !userId || aiOptIn !== true) return;
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;
      setIsLoading(true);
      setHasError(false);
      try {
        const cursor = reset ? undefined : (nextCursorRef.current ?? undefined);
        const res = await getNostalgiaFeed({
          mode,
          limit: 15,
          seed,
          cursor,
          year: mode === "deep_dive_year" ? deepDiveYear : undefined,
        });

        const newItems: FeedItem[] = res.items ?? [];
        setItems((prev) => (reset ? newItems : mergeUnique(prev, newItems)));
        nextCursorRef.current = res.nextCursor ?? null;
        setNextCursor(nextCursorRef.current);
      } catch {
        setHasError(true);
      } finally {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    },
    [
      aiOptIn,
      aiOptInLoading,
      deepDiveYear,
      getNostalgiaFeed,
      mergeUnique,
      mode,
      seed,
      userId,
      userLoading,
    ],
  );

  // Load on mount and mode change
  useEffect(() => {
    if (userLoading || aiOptInLoading || !userId) return;
    setItems([]);
    setNextCursor(null);
    nextCursorRef.current = null;
    setHasError(false);
    if (aiOptIn === true) {
      void loadMore(true);
    }
  }, [mode, deepDiveYear, aiOptIn, aiOptInLoading, loadMore, userId, userLoading]);

  // Infinite scroll observer
  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && nextCursor && !isLoading && !hasError) {
          loadMore();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [nextCursor, isLoading, hasError, loadMore]);

  if (userLoading || aiOptInLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!userId) {
    return (
      <>
        <PageHeader
          title="Nostalgia Feed"
          description="A story of your life, told through photos"
        />
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Sign in to view your feed
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            Your feed is personalized to your account.
          </p>
          <Link href="/login">
            <Button variant="outline" size="sm">
              Go to Login
            </Button>
          </Link>
        </div>
      </>
    );
  }

  if (aiOptIn !== true) {
    return (
      <>
        <PageHeader
          title="Nostalgia Feed"
          description="A story of your life, told through photos"
        />
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 mb-4">
            <Sparkles className="h-8 w-8 text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Enable AI Intelligence
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            The Nostalgia Feed uses AI to surface your most meaningful memories.
            Enable AI Intelligence in Settings to get started.
          </p>
          <Link href="/settings">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
              Go to Settings
            </Button>
          </Link>
        </div>
      </>
    );
  }

  const currentMode = modeConfig[mode];

  return (
    <>
      <PageHeader
        title="Nostalgia Feed"
        description="A story of your life, told through photos"
      />

      <div className="px-8 py-6">
        {/* Mode tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {(Object.keys(modeConfig) as FeedMode[]).map((m) => {
            const config = modeConfig[m];
            const Icon = config.icon;
            const isActive = mode === m;
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200",
                  isActive
                    ? "bg-purple-500/15 text-purple-300 border border-purple-500/30 shadow-sm shadow-purple-500/10"
                    : "bg-secondary/50 text-muted-foreground border border-border hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className={cn("h-4 w-4", isActive && "text-purple-400")} />
                {config.label}
              </button>
            );
          })}
        </div>

        {/* Deep dive year selector */}
        {mode === "deep_dive_year" && (
          <div className="flex items-center gap-3 mb-6">
            <span className="text-sm text-muted-foreground">Year:</span>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {Array.from(
                { length: 20 },
                (_, i) => new Date().getFullYear() - 1 - i,
              ).map((y) => (
                <button
                  key={y}
                  onClick={() => setDeepDiveYear(y)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200",
                    y === deepDiveYear
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm shadow-purple-500/10"
                      : "bg-secondary text-muted-foreground hover:bg-accent",
                  )}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mode description */}
        <p className="text-sm text-muted-foreground mb-8">
          {currentMode.description}
        </p>

        {/* Initial loading skeletons */}
        {items.length === 0 && isLoading && (
          <div className="mx-auto max-w-2xl space-y-6">
            <FeedCardSkeleton />
            <FeedCardSkeleton />
            <FeedCardSkeleton />
          </div>
        )}

        {/* Error state */}
        {hasError && items.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 mb-4">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              Failed to load feed
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Something went wrong. Please try again.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadMore(true)}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          </div>
        )}

        {/* Empty state */}
        {items.length === 0 && !isLoading && !hasError && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary mb-4">
              <ImageOff className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              No memories found
            </p>
            <p className="text-xs text-muted-foreground max-w-sm text-center">
              {currentMode.emptyHint}
            </p>
          </div>
        )}

        {/* Feed items */}
        {items.length > 0 && (
          <div className="mx-auto max-w-2xl space-y-6">
            {items.map((item) => (
              <FeedCardWithPhoto
                key={item.photoId}
                item={item}
                onFavorite={(id) =>
                  toggleFavorite({ photoId: id as any })
                }
              />
            ))}
          </div>
        )}

        {/* Loading / scroll sentinel */}
        <div ref={observerRef} className="flex justify-center py-8">
          {isLoading && items.length > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Loading more memories...</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
