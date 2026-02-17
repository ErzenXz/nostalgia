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
import { motion } from "framer-motion";
import {
  Sparkles,
  Calendar,
  Shuffle,
  Telescope,
  Loader2,
  Heart,
  Settings,
  AlertTriangle,
  RefreshCw,
  ImageOff,
  Share2,
  FolderPlus,
  MapPin,
} from "lucide-react";
import Link from "next/link";

type FeedMode = "nostalgia" | "on_this_day" | "deep_dive_year" | "serendipity";

interface FeedItem {
  photoId: string;
  takenAt: number | null;
  uploadedAt: number;
  mimeType?: string;
  reason: string;
  score: number;
  scoreBreakdown: { nostalgia: number; coherence: number };
  captionShort: string | null;
  aiTagsV2: string[] | null;
  locationName?: string | null;
  detectedFaces?: number | null;
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

function FeedCardSkeleton({ variant = "medium" }: { variant?: "hero" | "medium" | "small" }) {
  const aspectClass =
    variant === "hero" ? "aspect-[16/9]" : variant === "small" ? "aspect-square" : "aspect-[4/3]";
  return (
    <div className="rounded-2xl border border-border/50 bg-card/50 overflow-hidden">
      <div className={cn(aspectClass, "w-full bg-secondary/40 relative overflow-hidden")}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent animate-[shimmer_2s_infinite] -translate-x-full" />
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-20 rounded-full bg-secondary/60 animate-pulse" />
          <div className="h-3 w-28 rounded-full bg-secondary/40 animate-pulse" />
        </div>
        <div className="h-4 w-3/4 rounded bg-secondary/40 animate-pulse" />
        <div className="flex gap-1.5">
          <div className="h-5 w-14 rounded-md bg-secondary/30 animate-pulse" />
          <div className="h-5 w-10 rounded-md bg-secondary/30 animate-pulse" />
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
  variant = "medium",
}: {
  storageKey: string;
  thumbnailStorageKey?: string;
  mimeType: string;
  isEncrypted?: boolean;
  alt: string;
  variant?: "hero" | "medium" | "small";
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
  const aspectClass =
    variant === "hero" ? "aspect-[16/9]" : variant === "small" ? "aspect-square" : "aspect-[4/3]";

  if (!displayUrl) {
    return (
      <div className={cn(aspectClass, "w-full bg-secondary/40 relative overflow-hidden")}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent animate-[shimmer_2s_infinite] -translate-x-full" />
      </div>
    );
  }

  return (
    <div className={cn("relative w-full overflow-hidden", aspectClass)}>
      <Image
        src={displayUrl}
        alt={alt}
        fill
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        sizes={variant === "hero" ? "(max-width: 768px) 100vw, 80vw" : "(max-width: 768px) 100vw, 40vw"}
        unoptimized
      />
    </div>
  );
}

// ─── Time Ago Helper ───────────────────────────────────────

function timeAgoLabel(timestamp: number): string {
  const years = Math.floor((Date.now() - timestamp) / (365.25 * 24 * 60 * 60 * 1000));
  if (years === 0) return "This year";
  if (years === 1) return "1 year ago";
  return `${years} years ago`;
}

// ─── Feed Card ─────────────────────────────────────────────

function FeedCard({
  item,
  photo,
  variant = "medium",
  onFavorite,
}: {
  item: FeedItem;
  photo: any;
  variant?: "hero" | "medium" | "small";
  onFavorite: (id: string) => void;
}) {
  const [isLiked, setIsLiked] = useState(photo?.isFavorite ?? false);

  if (!photo) return null;

  const date = item.takenAt ?? item.uploadedAt;

  const handleFavorite = () => {
    setIsLiked(!isLiked);
    onFavorite(item.photoId);
  };

  return (
    <Link href={`/photos/${item.photoId}`} className="block">
      <div className="group relative rounded-2xl border border-border/40 bg-card/60 overflow-hidden transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-black/20">
        {/* Photo */}
        <FeedPhoto
          storageKey={photo.storageKey}
          thumbnailStorageKey={photo.thumbnailStorageKey}
          mimeType={photo.mimeType}
          isEncrypted={photo.isEncrypted}
          alt={item.captionShort || photo.fileName}
          variant={variant}
        />

        {/* Overlay gradients */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />

        {/* Reason badge */}
        <div className="absolute top-3 left-3">
          <span className="glass-subtle inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white/90 uppercase tracking-wider">
            <Sparkles className="h-2.5 w-2.5 text-primary" />
            {item.reason}
          </span>
        </div>

        {/* Caption overlay on image */}
        {item.captionShort && variant !== "small" && (
          <div className="absolute bottom-0 inset-x-0 px-4 pb-3 pointer-events-none">
            <p className="text-sm text-white/90 font-medium leading-snug drop-shadow-sm line-clamp-2">
              {item.captionShort}
            </p>
          </div>
        )}

        {/* Content below image */}
        <div className="px-4 py-3 space-y-2">
          {/* Date + Time ago */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {date ? formatDate(date) : "Unknown date"}
            </div>
            {date && (
              <span className="text-[10px] font-medium text-primary/60 tabular-nums">
                {timeAgoLabel(date)}
              </span>
            )}
          </div>

          {/* Location */}
          {photo.locationName && variant !== "small" && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{photo.locationName}</span>
            </div>
          )}

          {/* Tags */}
          {item.aiTagsV2 && item.aiTagsV2.length > 0 && variant !== "small" && (
            <div className="flex flex-wrap gap-1">
              {item.aiTagsV2.slice(0, variant === "hero" ? 8 : 5).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 bg-secondary/50 text-muted-foreground"
                >
                  {tag}
                </Badge>
              ))}
              {item.aiTagsV2.length > (variant === "hero" ? 8 : 5) && (
                <span className="self-center text-[10px] text-muted-foreground/50">
                  +{item.aiTagsV2.length - (variant === "hero" ? 8 : 5)}
                </span>
              )}
            </div>
          )}

          {/* Interaction bar */}
          <div className="flex items-center gap-1 pt-1 -mx-1">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleFavorite();
              }}
            >
              <Heart
                className={cn(
                  "h-4 w-4 transition-all",
                  isLiked
                    ? "fill-red-500 text-red-500 animate-[heartPop_0.4s_ease-out]"
                    : "",
                )}
              />
              {variant !== "small" && (
                <span>{isLiked ? "Liked" : "Like"}</span>
              )}
            </button>
            {variant !== "small" && (
              <>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <FolderPlus className="h-4 w-4" />
                  <span>Album</span>
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <Share2 className="h-4 w-4" />
                  <span>Share</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Feed Card with Photo Hydration ───────────────────────

function FeedCardWithPhoto({
  item,
  variant = "medium",
  onFavorite,
  index,
}: {
  item: FeedItem;
  variant?: "hero" | "medium" | "small";
  onFavorite: (id: string) => void;
  index: number;
}) {
  const photo = useQuery(api.photos.getById, {
    photoId: item.photoId as any,
  });

  if (photo === undefined) {
    return <FeedCardSkeleton variant={variant} />;
  }

  if (photo === null) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: Math.min(index * 0.06, 0.3),
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <FeedCard item={item} photo={photo} variant={variant} onFavorite={onFavorite} />
    </motion.div>
  );
}

// ─── Card variant helper ──────────────────────────────────

function getCardVariant(index: number): "hero" | "medium" | "small" {
  if (index === 0) return "hero";
  const pos = (index - 1) % 5;
  if (pos < 2) return "medium";
  return "small";
}

// ─── Main Page ─────────────────────────────────────────────

export default function FeedPage() {
  const [mode, setMode] = useState<FeedMode>("nostalgia");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [seed] = useState(() => crypto.randomUUID());
  const [deepDiveYear, setDeepDiveYear] = useState(
    () => new Date().getFullYear() - 1,
  );
  const { userId, isLoading: userLoading } = useCurrentUser();
  const { aiOptIn, isLoading: aiOptInLoading } = useAiOptInForUserId(userId as any);
  const aiProgress = useQuery(
    api.users.getAiProgress,
    userId && aiOptIn === true ? { userId } : "skip",
  );
  const observerRef = useRef<HTMLDivElement>(null);
  const nextCursorRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);
  const itemsRef = useRef<FeedItem[]>([]);
  const feedTokenRef = useRef(0);

  const getNostalgiaFeed = useAction(api.feed.nostalgia.getNostalgiaFeed);
  const toggleFavorite = useMutation(api.photos.toggleFavorite);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

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
      const token = feedTokenRef.current;
      if (userLoading || aiOptInLoading || !userId || aiOptIn !== true) return;
      if (!reset && nextCursorRef.current === null) return;
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;
      if (token === feedTokenRef.current) {
        setIsLoading(true);
        setHasError(false);
      }
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
        const prev = reset ? [] : itemsRef.current;
        const merged = reset ? newItems : mergeUnique(prev, newItems);
        const added = merged.length - prev.length;
        const shouldContinue = added > 0 && newItems.length > 0;

        if (token === feedTokenRef.current) {
          itemsRef.current = merged;
          setItems(merged);
          nextCursorRef.current = shouldContinue ? (res.nextCursor ?? null) : null;
        }
      } catch {
        if (token === feedTokenRef.current) setHasError(true);
      } finally {
        isLoadingRef.current = false;
        if (token === feedTokenRef.current) setIsLoading(false);
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

  useEffect(() => {
    if (userLoading || aiOptInLoading || !userId) return;
    feedTokenRef.current += 1;
    isLoadingRef.current = false;
    setIsLoading(false);
    itemsRef.current = [];
    setItems([]);
    nextCursorRef.current = null;
    setHasError(false);
    if (aiOptIn === true) {
      void loadMore(true);
    }
  }, [mode, deepDiveYear, aiOptIn, aiOptInLoading, loadMore, userId, userLoading]);

  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (!nextCursorRef.current) return;
        if (isLoadingRef.current || hasError) return;
        void loadMore();
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasError, loadMore]);

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
          <h3 className="text-lg font-heading font-semibold text-foreground mb-2">
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
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-primary/20 mb-4">
            <Sparkles className="h-8 w-8 text-purple-400" />
          </div>
          <h3 className="text-lg font-heading font-semibold text-foreground mb-2">
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

  const showIndexingBanner =
    aiProgress &&
    aiProgress.total > 0 &&
    !aiProgress.isComplete &&
    aiProgress.pending > 0;

  return (
    <>
      <PageHeader
        title="Nostalgia Feed"
        description="A story of your life, told through photos"
      />

      {showIndexingBanner && (
        <div className="mx-4 md:mx-8 mt-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="h-1.5 rounded-full bg-amber-500/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-500"
                style={{ width: `${aiProgress.percent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              <span className="text-foreground font-medium">{aiProgress.processed}</span>
              {" of "}
              <span className="text-foreground font-medium">{aiProgress.total}</span>
              {" indexed ("}
              <span className="text-foreground font-medium">{aiProgress.percent}%</span>
              {") — "}
              <span className="text-foreground font-medium">{aiProgress.pending}</span>
              {" left"}
            </p>
          </div>
        </div>
      )}

      <div className="px-4 md:px-8 py-6">
        {/* Mode tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-none">
          {(Object.keys(modeConfig) as FeedMode[]).map((m) => {
            const config = modeConfig[m];
            const Icon = config.icon;
            const isActive = mode === m;
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200",
                  isActive
                    ? "bg-primary/15 text-primary border border-primary/30 shadow-sm shadow-primary/5"
                    : "bg-secondary/40 text-muted-foreground border border-transparent hover:bg-secondary/70 hover:text-foreground",
                )}
              >
                <Icon className={cn("h-4 w-4", isActive && "text-primary")} />
                {config.label}
              </button>
            );
          })}
        </div>

        {/* Deep dive year selector */}
        {mode === "deep_dive_year" && (
          <div className="flex items-center gap-3 mb-5">
            <span className="text-sm text-muted-foreground">Year:</span>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
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
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-secondary/40 text-muted-foreground hover:bg-secondary/70",
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="md:col-span-2 lg:col-span-3">
              <FeedCardSkeleton variant="hero" />
            </div>
            <FeedCardSkeleton variant="medium" />
            <FeedCardSkeleton variant="medium" />
            <FeedCardSkeleton variant="small" />
            <FeedCardSkeleton variant="small" />
            <FeedCardSkeleton variant="small" />
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
            <Button variant="outline" size="sm" onClick={() => loadMore(true)}>
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
            <p className="text-[11px] text-muted-foreground/70 mt-3 max-w-xs text-center">
              New uploads get AI descriptions and tags within a few minutes. Refresh to see them.
            </p>
          </div>
        )}

        {/* Feed items - masonry grid */}
        {items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-auto">
            {items.map((item, i) => {
              const variant = getCardVariant(i);
              const isHero = variant === "hero";
              return (
                <div
                  key={item.photoId}
                  className={cn(
                    isHero && "md:col-span-2 lg:col-span-3",
                  )}
                >
                  <FeedCardWithPhoto
                    item={item}
                    variant={variant}
                    onFavorite={(id) => toggleFavorite({ photoId: id as any })}
                    index={i}
                  />
                </div>
              );
            })}
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
