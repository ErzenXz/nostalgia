"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAiOptInForUserId } from "@/hooks/use-ai-opt-in";
import { usePhotoUrl } from "@/hooks/use-photo-url";
import { useDecryptedBlobUrl } from "@/hooks/use-decrypted-blob-url";
import Image from "next/image";
import { cn, formatDate } from "@/lib/utils";
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
  MapPin,
  Play,
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
    label: "For You",
    icon: Sparkles,
    description: "Curated by AI from your most meaningful moments",
    emptyHint: "Upload photos spanning different time periods to unlock nostalgia scoring",
  },
  on_this_day: {
    label: "On This Day",
    icon: Calendar,
    description: "See what you were doing on this day in past years",
    emptyHint: "Photos with dates from previous years will appear here",
  },
  deep_dive_year: {
    label: "Year Dive",
    icon: Telescope,
    description: "Explore a specific year in detail",
    emptyHint: "Select a year that has photos to explore",
  },
  serendipity: {
    label: "Rediscover",
    icon: Shuffle,
    description: "Forgotten moments you haven't seen in a while",
    emptyHint: "The more photos you upload, the better the surprises",
  },
};

// ── Time ago ─────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const years = Math.floor((Date.now() - ts) / (365.25 * 24 * 60 * 60 * 1000));
  if (years === 0) return "This year";
  if (years === 1) return "1 year ago";
  return `${years} years ago`;
}

// ── Card Image ──────────────────────────────────────────────

function CardImage({
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
  const decryptedUrl = useDecryptedBlobUrl({
    cacheKey: imageKey,
    signedUrl,
    mimeType: isThumb ? "image/jpeg" : mimeType,
    enabled: !!isEncrypted,
  });

  const displayUrl = isEncrypted ? decryptedUrl : signedUrl;
  const isVideo = mimeType.startsWith("video/");

  if (!displayUrl) {
    return <div className="absolute inset-0 bg-[#1a1a1a] animate-pulse" />;
  }

  return (
    <>
      <Image
        src={displayUrl}
        alt={alt}
        fill
        className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
        sizes="(max-width: 640px) 100vw, 560px"
        unoptimized
      />
      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-14 w-14 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg">
            <Play className="h-6 w-6 text-white fill-white ml-0.5" />
          </div>
        </div>
      )}
    </>
  );
}

// ── Feed Card ───────────────────────────────────────────────
// Instagram-style: full-width photo, actions + caption below

function FeedCard({
  item,
  photo,
  onFavorite,
}: {
  item: FeedItem;
  photo: any;
  onFavorite: (id: string) => void;
}) {
  const [liked, setLiked] = useState(photo?.isFavorite ?? false);

  if (!photo) return null;

  const date = item.takenAt ?? item.uploadedAt;

  return (
    <article className="w-full">
      {/* ── Photo ── */}
      <Link href={`/photos/${item.photoId}`} className="block group relative">
        {/* Aspect: square for portrait feel like Instagram */}
        <div className="relative w-full aspect-square overflow-hidden rounded-2xl bg-[#1a1a1a]">
          <CardImage
            storageKey={photo.storageKey}
            thumbnailStorageKey={photo.thumbnailStorageKey}
            mimeType={photo.mimeType}
            isEncrypted={photo.isEncrypted}
            alt={item.captionShort || photo.fileName}
          />

          {/* Subtle bottom gradient for legibility */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />

          {/* AI score badge — top right */}
          {item.score > 0.7 && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md rounded-full px-2.5 py-1 border border-white/10">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="text-[11px] font-medium text-primary">Top memory</span>
            </div>
          )}

          {/* Time ago — bottom left */}
          {date && (
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md rounded-full px-2.5 py-1 border border-white/10">
              <span className="text-[11px] font-medium text-white/90">
                {timeAgo(date)}
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* ── Actions ── */}
      <div className="flex items-center gap-1 px-1 pt-3 pb-2">
        <button
          type="button"
          onClick={() => {
            setLiked(!liked);
            onFavorite(item.photoId);
          }}
          className="group/heart flex items-center gap-1.5 p-1.5 rounded-full hover:bg-white/[0.06] transition-colors"
        >
          <Heart
            className={cn(
              "h-6 w-6 transition-all duration-200",
              liked
                ? "fill-red-500 text-red-500 scale-110"
                : "text-[#ccc] group-hover/heart:text-white",
            )}
          />
        </button>

        {/* Location pill */}
        {photo.locationName && (
          <div className="ml-auto flex items-center gap-1 text-[12px] text-[#888]">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate max-w-[140px]">{photo.locationName}</span>
          </div>
        )}
      </div>

      {/* ── Caption & metadata ── */}
      <div className="px-1 space-y-2">
        {/* Caption */}
        {(item.captionShort || photo.fileName) && (
          <p className="text-[14px] text-white font-medium leading-snug line-clamp-3">
            {item.captionShort || photo.fileName}
          </p>
        )}

        {/* Date */}
        {date && (
          <p className="text-[12px] text-[#888]">{formatDate(date)}</p>
        )}

        {/* AI tags */}
        {item.aiTagsV2 && item.aiTagsV2.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {item.aiTagsV2.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.07] text-[#bbb] border border-white/[0.08]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

// ── Skeleton card ────────────────────────────────────────────

function FeedCardSkeleton() {
  return (
    <div className="w-full space-y-3">
      <div className="aspect-square w-full rounded-2xl bg-[#1a1a1a] animate-pulse" />
      <div className="space-y-2 px-1">
        <div className="h-4 w-3/4 rounded-full bg-white/[0.06] animate-pulse" />
        <div className="h-3 w-1/3 rounded-full bg-white/[0.04] animate-pulse" />
        <div className="flex gap-1.5 pt-1">
          <div className="h-5 w-14 rounded-full bg-white/[0.05] animate-pulse" />
          <div className="h-5 w-16 rounded-full bg-white/[0.05] animate-pulse" />
          <div className="h-5 w-12 rounded-full bg-white/[0.05] animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ── Hydrated card ────────────────────────────────────────────

function FeedCardHydrated({
  item,
  onFavorite,
  index,
}: {
  item: FeedItem;
  onFavorite: (id: string) => void;
  index: number;
}) {
  const photo = useQuery(api.photos.getById, { photoId: item.photoId as any });

  if (photo === undefined) {
    return <FeedCardSkeleton />;
  }
  if (!photo) return null;

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
      <FeedCard item={item} photo={photo} onFavorite={onFavorite} />
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function FeedPage() {
  const [mode, setMode] = useState<FeedMode>("nostalgia");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [seed] = useState(() => crypto.randomUUID());
  const [deepDiveYear, setDeepDiveYear] = useState(() => new Date().getFullYear() - 1);

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

  useEffect(() => { itemsRef.current = items; }, [items]);

  const mergeUnique = useCallback((prev: FeedItem[], next: FeedItem[]) => {
    const seen = new Set(prev.map((i) => i.photoId));
    const out = [...prev];
    for (const item of next) {
      if (!seen.has(item.photoId)) { seen.add(item.photoId); out.push(item); }
    }
    return out;
  }, []);

  const loadMore = useCallback(async (reset = false) => {
    const token = feedTokenRef.current;
    if (userLoading || aiOptInLoading || !userId || aiOptIn !== true) return;
    if (!reset && nextCursorRef.current === null) return;
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    if (token === feedTokenRef.current) { setIsLoading(true); setHasError(false); }
    try {
      const res = await getNostalgiaFeed({
        mode,
        limit: 12,
        seed,
        cursor: reset ? undefined : (nextCursorRef.current ?? undefined),
        year: mode === "deep_dive_year" ? deepDiveYear : undefined,
      });
      const newItems: FeedItem[] = res.items ?? [];
      const prev = reset ? [] : itemsRef.current;
      const merged = reset ? newItems : mergeUnique(prev, newItems);
      if (token === feedTokenRef.current) {
        itemsRef.current = merged;
        setItems(merged);
        nextCursorRef.current = merged.length > prev.length && newItems.length > 0 ? (res.nextCursor ?? null) : null;
      }
    } catch {
      if (token === feedTokenRef.current) setHasError(true);
    } finally {
      isLoadingRef.current = false;
      if (token === feedTokenRef.current) setIsLoading(false);
    }
  }, [aiOptIn, aiOptInLoading, deepDiveYear, getNostalgiaFeed, mergeUnique, mode, seed, userId, userLoading]);

  useEffect(() => {
    if (userLoading || aiOptInLoading || !userId) return;
    feedTokenRef.current += 1;
    isLoadingRef.current = false;
    setIsLoading(false);
    itemsRef.current = [];
    setItems([]);
    nextCursorRef.current = null;
    setHasError(false);
    if (aiOptIn === true) void loadMore(true);
  }, [mode, deepDiveYear, aiOptIn, aiOptInLoading, loadMore, userId, userLoading]);

  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || !nextCursorRef.current || isLoadingRef.current || hasError) return;
        void loadMore();
      },
      { rootMargin: "600px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasError, loadMore]);

  // ── Loading gate ────────────────────────────────────────

  if (userLoading || aiOptInLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-[#888]" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-8 text-center">
        <h2 className="text-xl font-semibold text-white mb-2">Sign in to view your feed</h2>
        <p className="text-sm text-[#999] mb-6">Your feed is personalized to your account.</p>
        <Link
          href="/login"
          className="px-5 py-2.5 rounded-full bg-primary text-black text-sm font-semibold hover:brightness-110 transition-all"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (aiOptIn !== true) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.06] border border-white/[0.1] mb-5">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Enable AI Intelligence</h2>
        <p className="text-sm text-[#999] max-w-sm mb-6 leading-relaxed">
          The Nostalgia Feed uses AI to surface your most meaningful memories.
          Enable AI Intelligence in Settings to get started.
        </p>
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-black text-sm font-semibold hover:brightness-110 transition-all"
        >
          <Settings className="h-4 w-4" />
          Open Settings
        </Link>
      </div>
    );
  }

  const currentMode = modeConfig[mode];
  const showIndexingBanner =
    aiProgress && aiProgress.total > 0 && !aiProgress.isComplete && aiProgress.pending > 0;

  return (
    <div className="min-h-screen">
      {/* ── Sticky header with mode tabs ── */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-[560px] mx-auto px-4">
          {/* Page title */}
          <div className="flex items-center justify-between pt-5 pb-3">
            <div>
              <h1 className="text-[22px] font-semibold text-white tracking-tight font-heading">
                {currentMode.label}
              </h1>
              <p className="text-[12px] text-[#888] mt-0.5">{currentMode.description}</p>
            </div>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none">
            {(Object.keys(modeConfig) as FeedMode[]).map((m) => {
              const config = modeConfig[m];
              const Icon = config.icon;
              const isActive = mode === m;
              return (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-medium whitespace-nowrap transition-all duration-200 shrink-0 border",
                    isActive
                      ? "bg-white text-black border-white shadow-sm"
                      : "bg-transparent border-white/[0.12] text-[#bbb] hover:border-white/[0.25] hover:text-white",
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-black" : "text-[#888]")} />
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Feed content ── */}
      <div className="max-w-[560px] mx-auto px-4 py-6 space-y-6">

        {/* ── AI indexing progress banner ── */}
        {showIndexingBanner && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
            <Sparkles className="h-4 w-4 text-primary shrink-0 animate-pulse" />
            <div className="flex-1 min-w-0">
              <div className="h-1 rounded-full bg-white/[0.08] overflow-hidden mb-1.5">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${aiProgress.percent}%` }}
                />
              </div>
              <p className="text-[12px] text-[#888]">
                Indexing {aiProgress.processed} of {aiProgress.total} photos
                <span className="text-[#666]"> · {aiProgress.pending} remaining</span>
              </p>
            </div>
          </div>
        )}

        {/* ── Year selector (Deep Dive) ── */}
        {mode === "deep_dive_year" && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4">
            <span className="text-[11px] font-medium text-[#888] uppercase tracking-wider shrink-0">Year</span>
            {Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - 1 - i).map((y) => (
              <button
                key={y}
                onClick={() => setDeepDiveYear(y)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[13px] font-medium transition-all duration-150 shrink-0 border",
                  y === deepDiveYear
                    ? "bg-white text-black border-white"
                    : "bg-transparent border-white/[0.1] text-[#aaa] hover:border-white/[0.25] hover:text-white",
                )}
              >
                {y}
              </button>
            ))}
          </div>
        )}

        {/* ── Error state ── */}
        {hasError && items.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertTriangle className="h-9 w-9 text-[#888] mb-3" />
            <p className="text-[16px] font-medium text-white mb-1">Failed to load feed</p>
            <p className="text-[13px] text-[#888] mb-5">Something went wrong, please try again.</p>
            <button
              onClick={() => loadMore(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.08] text-white text-sm hover:bg-white/[0.12] transition-colors border border-white/[0.1]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        )}

        {/* ── Empty state ── */}
        {items.length === 0 && !isLoading && !hasError && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ImageOff className="h-10 w-10 text-[#555] mb-4" />
            <p className="text-[16px] font-medium text-white mb-2">No memories found</p>
            <p className="text-[13px] text-[#888] max-w-xs leading-relaxed">{currentMode.emptyHint}</p>
          </div>
        )}

        {/* ── Initial loading skeletons ── */}
        {isLoading && items.length === 0 && (
          <div className="space-y-10">
            {Array.from({ length: 3 }).map((_, i) => (
              <FeedCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* ── Feed posts ── */}
        {items.length > 0 && (
          <div className="space-y-10">
            {items.map((item, i) => (
              <FeedCardHydrated
                key={item.photoId}
                item={item}
                onFavorite={(id) => toggleFavorite({ photoId: id as any })}
                index={i}
              />
            ))}
          </div>
        )}

        {/* ── Load more sentinel ── */}
        <div ref={observerRef} className="flex justify-center py-6">
          {isLoading && items.length > 0 && (
            <div className="flex items-center gap-2.5 text-[#888] text-[13px]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading more memories...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
