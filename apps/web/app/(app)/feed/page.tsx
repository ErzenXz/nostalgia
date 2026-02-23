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
    <div className="rounded-xl overflow-hidden film-print">
      <div className={cn(aspectClass, "w-full bg-[#0d0c0b] relative overflow-hidden")}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-900/[0.04] to-transparent animate-[shimmer_2.5s_ease-in-out_infinite] -translate-x-full" />
      </div>
      <div className="px-3 py-2.5 border-t border-amber-900/12 bg-[#0c0b0a] space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-16 rounded-sm bg-amber-900/20 animate-pulse" />
          <div className="h-2.5 w-24 rounded-sm bg-amber-900/12 animate-pulse" />
        </div>
        <div className="h-3 w-2/3 rounded-sm bg-amber-900/12 animate-pulse" />
        <div className="flex gap-1">
          <div className="h-3.5 w-14 rounded-sm bg-amber-900/10 animate-pulse" />
          <div className="h-3.5 w-10 rounded-sm bg-amber-900/8 animate-pulse" />
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
      <div className={cn(aspectClass, "w-full bg-[#0d0c0b] relative overflow-hidden")}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-900/[0.04] to-transparent animate-[shimmer_2.5s_ease-in-out_infinite] -translate-x-full" />
      </div>
    );
  }

  return (
    <div className={cn("relative w-full overflow-hidden", aspectClass)}>
      <Image
        src={displayUrl}
        alt={alt}
        fill
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] photo-warm"
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
  if (years === 1) return "1 yr ago";
  return `${years} yrs ago`;
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
  const aspectClass =
    variant === "hero" ? "aspect-[16/9]" : variant === "small" ? "aspect-square" : "aspect-[4/3]";

  const handleFavorite = () => {
    setIsLiked(!isLiked);
    onFavorite(item.photoId);
  };

  return (
    <Link href={`/photos/${item.photoId}`} className="block group">
      <article
        className={cn(
          "overflow-hidden rounded-xl film-print",
          "transition-all duration-500",
        )}
      >
        {/* Photo */}
        <div className={cn("relative w-full overflow-hidden", aspectClass)}>
          <FeedPhoto
            storageKey={photo.storageKey}
            thumbnailStorageKey={photo.thumbnailStorageKey}
            mimeType={photo.mimeType}
            isEncrypted={photo.isEncrypted}
            alt={item.captionShort || photo.fileName}
            variant={variant}
          />

          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/5 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />

          {/* Warm hover ring */}
          <div className="absolute inset-0 ring-1 ring-inset ring-amber-400/0 group-hover:ring-amber-400/10 transition-all duration-700 pointer-events-none" />

          {/* Reason badge — film edge label */}
          <div className="absolute top-3 left-3 z-10">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2 py-1 rounded-sm",
                "bg-black/75 backdrop-blur-sm",
                "border border-amber-700/25",
                "text-[9px] font-mono uppercase tracking-[0.18em] text-amber-500/90",
              )}
            >
              <Sparkles className="h-2 w-2 text-amber-400" />
              {item.reason}
            </span>
          </div>

          {/* Time ago badge top right */}
          {date && (
            <div className="absolute top-3 right-3 z-10">
              <span
                className={cn(
                  "inline-flex items-center px-2 py-1 rounded-sm",
                  "bg-black/70 backdrop-blur-sm",
                  "border border-amber-900/20",
                  "text-[9px] font-mono text-amber-600/70 tabular-nums",
                )}
              >
                {timeAgoLabel(date)}
              </span>
            </div>
          )}

          {/* Caption overlay bottom */}
          {item.captionShort && variant !== "small" && (
            <div className="absolute bottom-0 inset-x-0 px-4 pb-3 z-10 pointer-events-none">
              {photo.locationName && variant === "hero" && (
                <p className="flex items-center gap-1 text-[10px] text-amber-400/70 font-mono mb-1.5 uppercase tracking-wider">
                  <MapPin className="h-2.5 w-2.5 shrink-0" />
                  {photo.locationName}
                </p>
              )}
              <p
                className={cn(
                  "text-white/90 font-serif leading-snug drop-shadow-lg line-clamp-2",
                  variant === "hero" ? "text-base sm:text-lg" : "text-sm",
                )}
              >
                {item.captionShort}
              </p>
            </div>
          )}
        </div>

        {/* Negative strip — metadata footer */}
        <div className="px-3 py-2.5 bg-gradient-to-b from-[#0e0d0c] to-[#0c0b0a] border-t border-amber-900/15">
          {/* Date + location row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-2.5 w-2.5 text-amber-800/40 shrink-0" />
              <span className="text-[10px] font-mono text-amber-800/55 tracking-wider">
                {date ? formatDate(date) : "—"}
              </span>
            </div>
            {photo.locationName && variant !== "small" && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-amber-800/40 truncate max-w-[110px]">
                <MapPin className="h-2.5 w-2.5 shrink-0 text-amber-800/30" />
                {photo.locationName}
              </span>
            )}
          </div>

          {/* Tags */}
          {item.aiTagsV2 && item.aiTagsV2.length > 0 && variant !== "small" && (
            <div className="flex flex-wrap gap-1 mb-2.5">
              {item.aiTagsV2.slice(0, variant === "hero" ? 6 : 4).map((tag) => (
                <span
                  key={tag}
                  className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded-sm font-mono",
                    "bg-amber-950/40 text-amber-700/60",
                    "border border-amber-900/20",
                  )}
                >
                  {tag}
                </span>
              ))}
              {item.aiTagsV2.length > (variant === "hero" ? 6 : 4) && (
                <span className="text-[9px] text-amber-900/40 self-center font-mono">
                  +{item.aiTagsV2.length - (variant === "hero" ? 6 : 4)}
                </span>
              )}
            </div>
          )}

          {/* Action row */}
          <div className="flex items-center gap-0.5 -mx-1.5">
            <button
              type="button"
              className={cn(
                "flex items-center gap-1.5 rounded px-2 py-1.5 transition-all duration-200",
                "text-[10px] font-mono uppercase tracking-wider",
                "text-amber-900/45 hover:text-amber-400/80 hover:bg-amber-950/40",
              )}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleFavorite();
              }}
            >
              <Heart
                className={cn(
                  "h-3.5 w-3.5 transition-all duration-300",
                  isLiked
                    ? "fill-red-500/80 text-red-500/80 scale-110"
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
                  className="flex items-center gap-1.5 rounded px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-amber-900/45 hover:text-amber-400/80 hover:bg-amber-950/40 transition-all duration-200"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                  <span>Album</span>
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-amber-900/45 hover:text-amber-400/80 hover:bg-amber-950/40 transition-all duration-200"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Share</span>
                </button>
              </>
            )}
          </div>
        </div>
      </article>
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
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay: Math.min(index * 0.05, 0.25),
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <FeedCard item={item} photo={photo} variant={variant} onFavorite={onFavorite} />
    </motion.div>
  );
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
        <Loader2 className="h-6 w-6 animate-spin text-amber-700/50" />
      </div>
    );
  }

  if (!userId) {
    return (
      <>
        <PageHeader
          title="Nostalgia Feed"
          description="A story of your life, told through film"
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
          description="A story of your life, told through film"
        />
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-950/40 border border-amber-800/25 mb-4">
            <Sparkles className="h-8 w-8 text-amber-500/70" />
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
        description="A story of your life, told through film"
      />

      {/* AI indexing progress banner */}
      {showIndexingBanner && (
        <div className="mx-4 md:mx-6 mt-3 px-4 py-3 rounded-lg bg-amber-950/25 border border-amber-800/20 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="h-1 rounded-full bg-amber-950/60 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-600/70 transition-all duration-500"
                style={{ width: `${aiProgress.percent}%` }}
              />
            </div>
            <p className="text-[10px] font-mono text-amber-800/60 mt-1.5 tracking-wider">
              <span className="text-amber-600/80">{aiProgress.processed}</span>
              {" / "}
              <span className="text-amber-600/80">{aiProgress.total}</span>
              {" INDEXED · "}
              <span className="text-amber-600/80">{aiProgress.pending}</span>
              {" REMAINING"}
            </p>
          </div>
        </div>
      )}

      <div className="px-4 md:px-6 py-6">
        {/* Mode tabs — film strip style */}
        <div className="relative mb-6">
          {/* Decorative top line */}
          <div className="absolute -top-3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-900/15 to-transparent" />
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {(Object.keys(modeConfig) as FeedMode[]).map((m) => {
              const config = modeConfig[m];
              const Icon = config.icon;
              const isActive = mode === m;
              return (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "relative flex items-center gap-2 rounded-sm px-4 py-2.5 text-xs font-mono uppercase tracking-wider whitespace-nowrap transition-all duration-300",
                    isActive
                      ? "bg-amber-950/55 text-amber-400 border border-amber-700/40 shadow-[0_0_16px_rgba(201,166,107,0.12),inset_0_1px_0_rgba(201,166,107,0.06)]"
                      : "bg-[#0f0e0d]/70 text-amber-900/55 border border-amber-950/50 hover:border-amber-900/35 hover:text-amber-700/75 hover:bg-amber-950/25",
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5", isActive ? "text-amber-400" : "text-amber-900/50")} />
                  {config.label}
                </button>
              );
            })}
          </div>
          {/* Decorative bottom line */}
          <div className="absolute -bottom-3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-900/15 to-transparent" />
        </div>

        {/* Deep dive year selector */}
        {mode === "deep_dive_year" && (
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[10px] font-mono text-amber-800/50 uppercase tracking-wider">Year:</span>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {Array.from(
                { length: 20 },
                (_, i) => new Date().getFullYear() - 1 - i,
              ).map((y) => (
                <button
                  key={y}
                  onClick={() => setDeepDiveYear(y)}
                  className={cn(
                    "rounded-sm px-3 py-1.5 text-[11px] font-mono transition-all duration-200",
                    y === deepDiveYear
                      ? "bg-amber-950/55 text-amber-400 border border-amber-700/40"
                      : "bg-[#0f0e0d]/50 text-amber-900/50 border border-amber-950/40 hover:border-amber-900/30 hover:text-amber-700/70",
                  )}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mode description */}
        <p className="text-[11px] font-mono text-amber-800/45 tracking-wider uppercase mb-8">
          {currentMode.description}
        </p>

        {/* Initial loading skeletons */}
        {items.length === 0 && isLoading && (
          <div className="space-y-4">
            <FeedCardSkeleton variant="hero" />
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="masonry-item">
                  <FeedCardSkeleton variant={i % 3 === 2 ? "small" : "medium"} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error state */}
        {hasError && items.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-red-950/25 border border-red-900/20 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500/60" />
            </div>
            <p className="text-sm font-serif text-foreground/80 mb-1">Failed to load feed</p>
            <p className="text-[11px] font-mono text-amber-900/40 mb-5 uppercase tracking-wider">
              Something went wrong
            </p>
            <Button variant="outline" size="sm" onClick={() => loadMore(true)}>
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          </div>
        )}

        {/* Empty state */}
        {items.length === 0 && !isLoading && !hasError && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-950/25 border border-amber-900/20 mb-4">
              <ImageOff className="h-6 w-6 text-amber-800/40" />
            </div>
            <p className="text-sm font-serif text-foreground/80 mb-1">No memories found</p>
            <p className="text-[11px] font-mono text-amber-900/40 mb-2 uppercase tracking-wider text-center max-w-xs">
              {currentMode.emptyHint}
            </p>
            <p className="text-[10px] font-mono text-amber-900/30 max-w-xs text-center">
              New uploads get AI descriptions and tags within a few minutes. Refresh to see them.
            </p>
          </div>
        )}

        {/* Feed — hero + masonry grid */}
        {items.length > 0 && (
          <div className="space-y-4">
            {/* Hero card - full width */}
            <FeedCardWithPhoto
              item={items[0]!}
              variant="hero"
              onFavorite={(id) => toggleFavorite({ photoId: id as any })}
              index={0}
            />

            {/* Masonry grid for remaining items */}
            {items.length > 1 && (
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
                {items.slice(1).map((item, i) => (
                  <div key={item.photoId} className="masonry-item">
                    <FeedCardWithPhoto
                      item={item}
                      variant={i % 5 === 2 || i % 5 === 4 ? "small" : "medium"}
                      onFavorite={(id) => toggleFavorite({ photoId: id as any })}
                      index={i + 1}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Load more sentinel */}
        <div ref={observerRef} className="flex justify-center py-8">
          {isLoading && items.length > 0 && (
            <div className="flex items-center gap-2.5 text-amber-800/40">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-[10px] font-mono uppercase tracking-wider">
                Developing more memories...
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

